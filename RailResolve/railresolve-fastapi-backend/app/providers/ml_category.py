# app/providers/ml_category.py
# Hybrid classifier: trained model first, rule-based fallback.
#   1. ML prediction with calibrated confidence >= threshold -> ML_MODEL
#   2. ML prediction below threshold -> HUMAN_REVIEW_REQUIRED. We deliberately do
#      NOT fall back to keyword rules here: on held-out low-confidence rows the
#      rules were right ~21% of the time (ML's own guess ~42%), so they would
#      produce confident-looking wrong categories. The ML guess is mentioned in
#      `reason` only; a low-confidence guess is never presented as a decision.
#   3. no model / no usable text -> the existing keyword rules (unchanged behaviour)

from app.config import settings
from app.ml.category_model import DEPARTMENT_NAMES, get_category_model
from app.providers.interfaces import Classifier
from app.providers.rule_based import RuleBasedClassifier


class HybridCategoryClassifier(Classifier):
    def __init__(self, fallback: Classifier = None):
        self.fallback = fallback or RuleBasedClassifier()


    def classify(self, title, description, requested_category=None, requested_department=None):
        model = get_category_model()
        ml = None

        if model is not None:
            try:
                ml = model.predict(f"{title} {description}")
            except Exception:  # noqa: BLE001
                ml = None

        # Targeted override for explicit cleanliness complaints.
        text = f"{title} {description}".lower()
        cleanliness_terms = (
            "dirty", "cleanliness", "hygiene", "toilet", "restroom"
        )

        if any(term in text for term in cleanliness_terms):
            rule_result = self.fallback.classify(
                title, description, requested_category, requested_department
            )
            if rule_result["category"] == "Cleanliness":
                return rule_result

        if ml is not None:
            threshold = settings.CATEGORY_MIN_CONFIDENCE
            if threshold is None:
                threshold = model.default_min_confidence

            if ml["confidence"] >= threshold:
                dept = ml["department"]
                return {
                    "category": DEPARTMENT_NAMES.get(dept, dept),
                    "subcategory": None,
                    "department": dept,
                    "confidence": ml["confidence"],
                    "status": "ML_MODEL",
                    "reason": (
                        f"{ml['modelVersion']} (TF-IDF + LinearSVC); "
                        "confidence is the estimated probability this prediction "
                        "is correct, calibrated on held-out data."
                    ),
                }

        if ml is not None:
            guess = DEPARTMENT_NAMES.get(ml["department"], ml["department"])
            return {
                "category": requested_category,
                "subcategory": None,
                "department": requested_department,
                "confidence": ml["confidence"],
                "status": "HUMAN_REVIEW_REQUIRED",
                "reason": (
                    f"Model confidence below threshold; unreviewed suggestion: "
                    f"{guess} ({ml['confidence']})."
                ),
            }

        return self.fallback.classify(
            title, description, requested_category, requested_department
        )
