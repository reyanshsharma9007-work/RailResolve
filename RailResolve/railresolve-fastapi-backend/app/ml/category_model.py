# app/ml/category_model.py
# Loads the trained TF-IDF + LinearSVC department classifier and predicts.
# Fail-safe contract: if artifacts are missing, corrupt, or tampered with, the
# loader returns None and the service keeps working on the rule-based path.
#
# SECURITY: joblib artifacts are pickles. We only load from MODEL_DIR and
# verify each file's SHA-256 against metadata.json first, so a swapped/edited
# file is refused instead of executed.

import hashlib
import json
import threading
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np

from app.ml.text_cleaning import clean_text
from app.utils.logger import get_logger

logger = get_logger(__name__)

DEPARTMENT_NAMES = {
    "TICKET_TTE": "Ticket / TTE",
    "STATION_MAINTENANCE": "Station Maintenance",
    "TRAIN_MAINTENANCE": "Train Maintenance",
    "FOOD_WATER": "Food & Water",
    "TRAIN_OPERATIONS": "Train Operations",
    "BOOKING_REFUND": "Booking & Refund",
    "GENERAL_SUPPORT": "General Support",
}


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class CategoryModel:
    MAX_CONFIDENCE = 0.95

    def __init__(self, vectorizer, classifier, calibrator, metadata: dict):
        self.vectorizer = vectorizer
        self.classifier = classifier
        self.calibrator = calibrator
        self.metadata = metadata
        self.version: str = metadata.get("model_version", "category-svm")
        self.default_min_confidence: float = float(metadata.get("recommended_min_confidence", 0.5))

    @classmethod
    def load(cls, model_dir: Path) -> "CategoryModel":
        meta = json.loads((model_dir / "metadata.json").read_text())
        loaded = {}
        for key, filename in meta["artifacts"].items():
            path = model_dir / filename
            if _sha256(path) != meta["artifact_sha256"][key]:
                raise ValueError(f"Integrity check failed for {filename}")
            loaded[key] = joblib.load(path)
        return cls(loaded["vectorizer"], loaded["classifier"], loaded["calibrator"], meta)

    def predict(self, text: str, top_k: int = 3) -> Optional[dict]:
        cleaned = clean_text(text)
        if not cleaned:
            return None
        features = self.vectorizer.transform([cleaned])
        if features.nnz == 0:  # no known vocabulary: nothing to base a prediction on
            return None
        scores = self.classifier.decision_function(features)[0]
        order = np.argsort(scores)[::-1]
        classes = self.classifier.classes_
        gap = float(scores[order[0]] - scores[order[1]])
        # Cap: the calibrator is fit on a few hundred validation rows, so a literal 1.0 is not credible.
        confidence = min(float(self.calibrator.predict([gap])[0]), self.MAX_CONFIDENCE)
        return {
            "department": str(classes[order[0]]),
            "confidence": round(confidence, 3),
            "top": [{"department": str(classes[i]), "score": round(float(scores[i]), 3)} for i in order[:top_k]],
            "modelVersion": self.version,
        }


_model: Optional[CategoryModel] = None
_loaded = False
_lock = threading.Lock()


def load_category_model(force: bool = False) -> Optional[CategoryModel]:
    """Idempotent loader; safe to call at startup and lazily. Never raises."""
    global _model, _loaded
    with _lock:
        if _loaded and not force:
            return _model
        _loaded = True
        _model = None
        from app.config import settings  # local import keeps this module import-light for tests
        if not settings.CATEGORY_MODEL_ENABLED:
            logger.info("Category ML model disabled by configuration; using rule-based classification.")
            return None
        model_dir = Path(settings.CATEGORY_MODEL_DIR)
        if not model_dir.is_absolute():
            model_dir = Path(__file__).resolve().parents[2] / model_dir
        try:
            _model = CategoryModel.load(model_dir)
            logger.info("Loaded category model %s from %s", _model.version, model_dir)
        except FileNotFoundError:
            logger.warning("Category model not found at %s; using rule-based classification.", model_dir)
        except Exception as err:  # noqa: BLE001 - fail-safe boundary
            logger.error("Category model failed to load (%s); using rule-based classification.", err)
        return _model


def get_category_model() -> Optional[CategoryModel]:
    return _model if _loaded else load_category_model()
