# app/services/priority_service.py
# Combines Model 2 with the EXISTING explicit safety rules (RuleBasedPriorityPredictor,
# reused unchanged - no rules are duplicated or reimplemented here).
#
# Decision (see docs/AI_PRIORITY_MODEL.md): Model 2 is ADVISORY / SHADOW.
#  * /analyze keeps returning the rule-based `priority` exactly as before; the model's
#    result is attached under the new optional key `mlPriority`.
#  * `effectivePriority` = max(model label, explicit safety rule). A low-confidence or low
#    model prediction can never lower a complaint that matches an explicit safety term.
#  * Model 2 never produces CRITICAL (CivicDex has no such label); CRITICAL can only come
#    from the explicit rules (and Express's own policy still has the final word).
import logging
from typing import Optional

from app.config import settings
from app.ml.priority_model import PriorityModel, get_priority_model
from app.providers.ml_priority import MLPriorityPredictor
from app.providers.rule_based import RuleBasedPriorityPredictor

logger = logging.getLogger("app.services.priority_service")
_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
_LOW_COVERAGE = 0.5
_rules = RuleBasedPriorityPredictor()
_ml = MLPriorityPredictor()

DOMAIN_WARNING = ("Model trained on Chennai civic-service requests, not railway complaints; "
                  "treat as an advisory signal and rely on explicit safety rules for dangerous complaints.")


def _max(*vals):
    vals = [v for v in vals if v in _ORDER]
    return max(vals, key=_ORDER.index) if vals else None


def _safety(title: str, description: str) -> dict:
    r = _rules.predict(title, description)
    if r["recommendedPriority"] in ("HIGH", "CRITICAL"):
        return {"triggered": True, "priority": r["recommendedPriority"], "matched": list(r.get("reasons", []))}
    return {"triggered": False, "priority": None, "matched": []}


def predict_priority(title: str, description: str) -> Optional[dict]:
    """Returns None when Model 2 is not loaded (callers decide how to report that).
    Otherwise a PriorityPrediction-shaped dict (status ML_MODEL or NO_USABLE_TEXT)."""
    model: Optional[PriorityModel] = get_priority_model()
    if model is None:
        return None
    safety = _safety(title, description)
    pred = _ml.predict(title, description)
    if pred is None:
        return {"status": "NO_USABLE_TEXT", "modelVersion": model.version, "safetyRule": safety,
                "effectivePriority": safety["priority"], "advisoryOnly": True,
                "warnings": ["No usable text for the model (empty, or no known vocabulary); not guessing."]}
    ml_priority = pred["label"].upper() if pred["label"].upper() in _ORDER else None
    warnings = [DOMAIN_WARNING]
    low_cov = pred["vocabularyCoverage"] < _LOW_COVERAGE
    if low_cov:
        warnings.append("Most words in this text were never seen in training; the prediction is unreliable.")
    if safety["triggered"] and ml_priority and _ORDER.index(ml_priority) < _ORDER.index(safety["priority"]):
        warnings.append(f"Explicit safety rule ({safety['priority']}) overrides the lower model label.")
    return {
        "status": "ML_MODEL", "modelVersion": pred["modelVersion"], "predictedUrgency": pred["label"],
        "recommendedPriority": ml_priority, "confidence": pred["confidence"],
        "confidenceKind": model.probability_kind if pred["confidence"] is not None else None,
        "probabilities": pred["probabilities"],
        "effectivePriority": _max(ml_priority, safety["priority"]),
        "safetyRule": safety, "vocabularyCoverage": pred["vocabularyCoverage"], "lowCoverage": low_cov,
        "advisoryOnly": True, "warnings": warnings,
    }


def shadow_prediction(title: str, description: str) -> Optional[dict]:
    """Used by /analyze. Never raises, never affects Model 1 or the rule-based priority."""
    try:
        return predict_priority(title, description)
    except Exception as err:  # noqa: BLE001
        logger.error("Shadow priority prediction failed: %s", type(err).__name__)
        return None
