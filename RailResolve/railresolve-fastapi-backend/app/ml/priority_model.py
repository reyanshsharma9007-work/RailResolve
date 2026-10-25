# app/ml/priority_model.py
# Model 2 (priority/urgency) loader + predictor. Completely independent of Model 1:
# its own artifact directory (artifacts/priority), its own globals, its own status.
# A failure here can never affect Model 1 loading or serving.
#
# SECURITY: the artifact is a joblib pickle; its SHA-256 (from metadata.json) is
# verified before loading, and only MODEL_DIR is ever read.

import hashlib
import json
import logging
import re
import threading
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

from app.ml.priority_text import build_priority_input

logger = logging.getLogger("app.ml.priority_model")
_TOKEN = re.compile(r"(?u)\b\w+\b")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class PriorityModel:
    def __init__(self, pipeline, metadata: dict):
        self.pipeline = pipeline
        self.metadata = metadata
        self.version: str = metadata["model_version"]
        self.labels = [str(c) for c in pipeline.classes_]
        self.probability_supported: bool = bool(metadata.get("probability_supported")) and hasattr(pipeline, "predict_proba")
        self.probability_kind: Optional[str] = metadata.get("probability_kind")
        tfidf = pipeline.named_steps.get("tfidf")
        self._vocab = set(getattr(tfidf, "vocabulary_", {}) or {})

    @classmethod
    def load(cls, model_dir: Path) -> "PriorityModel":
        meta = json.loads((model_dir / "metadata.json").read_text())
        art = meta["artifact"]
        path = model_dir / art["file"]
        if _sha256(path) != art["sha256"]:
            raise ValueError(f"Integrity check failed for {art['file']}")
        pipeline = joblib.load(path)
        if sorted(str(c) for c in pipeline.classes_) != sorted(meta["labels"]):
            raise ValueError("Artifact classes do not match metadata labels")
        return cls(pipeline, meta)

    def coverage(self, normalized: str) -> float:
        """Share of the input's tokens the model's vocabulary has ever seen (0..1)."""
        tokens = _TOKEN.findall(normalized)
        return (sum(t in self._vocab for t in tokens) / len(tokens)) if tokens else 0.0

    def predict(self, title: str, description: str) -> Optional[dict]:
        """Returns None when there is nothing usable (empty or no known vocabulary)."""
        normalized = build_priority_input(title, description)
        if not normalized:
            return None
        coverage = self.coverage(normalized)
        if coverage == 0.0:
            return None
        if self.probability_supported:
            proba = self.pipeline.predict_proba([normalized])[0]
            order = int(np.argmax(proba))
            label = str(self.pipeline.classes_[order])
            probs = {str(c): round(float(p), 4) for c, p in zip(self.pipeline.classes_, proba)}
            confidence = round(float(proba[order]), 4)
        else:  # never present raw SVM decision scores as probabilities
            label, probs, confidence = str(self.pipeline.predict([normalized])[0]), None, None
        return {"label": label, "confidence": confidence, "probabilities": probs,
                "vocabularyCoverage": round(coverage, 3), "inputTokens": len(_TOKEN.findall(normalized)),
                "modelVersion": self.version}


# ---- process-wide state (Model 2 only) ----
_model: Optional[PriorityModel] = None
_state = {"state": "NOT_LOADED", "detail": None}
_loaded = False
_lock = threading.Lock()


def load_priority_model(force: bool = False) -> Optional[PriorityModel]:
    """Idempotent; never raises. States: READY, DISABLED, ARTIFACT_MISSING, LOAD_FAILED."""
    global _model, _loaded
    with _lock:
        if _loaded and not force:
            return _model
        _loaded, _model = True, None
        from app.config import settings  # local import: keeps this module import-light
        if not settings.PRIORITY_MODEL_ENABLED:
            _state.update(state="DISABLED", detail="PRIORITY_MODEL_ENABLED=false")
            logger.info("Priority model disabled by configuration.")
            return None
        model_dir = Path(settings.PRIORITY_MODEL_DIR)
        if not model_dir.is_absolute():
            model_dir = Path(__file__).resolve().parents[2] / model_dir
        try:
            _model = PriorityModel.load(model_dir)
            _state.update(state="READY", detail=None)
            logger.info("Loaded priority model %s from %s", _model.version, model_dir)
        except FileNotFoundError:
            _state.update(state="ARTIFACT_MISSING", detail=f"no artifact at {model_dir.name}")
            logger.warning("Priority model artifact not found at %s; /predict-priority will return 503.", model_dir)
        except Exception as err:  # noqa: BLE001 - fail-safe boundary; do not leak paths/internals to clients
            _state.update(state="LOAD_FAILED", detail=type(err).__name__)
            logger.error("Priority model failed to load (%s).", err)
        return _model


def get_priority_model() -> Optional[PriorityModel]:
    return _model if _loaded else load_priority_model()


def priority_model_status() -> dict:
    model = get_priority_model()
    return {"ready": model is not None, "state": _state["state"], "detail": _state["detail"],
            "version": model.version if model else None}
