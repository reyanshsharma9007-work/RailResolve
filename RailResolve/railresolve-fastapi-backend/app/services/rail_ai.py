from datetime import datetime, timezone
from app.services.priority_service import shadow_prediction
from app.providers.ml_category import HybridCategoryClassifier
from app.providers.rule_based import RuleBasedPriorityPredictor, RuleBasedDuplicateDetector, RuleBasedSummarizer

classifier = HybridCategoryClassifier()
priority_predictor = RuleBasedPriorityPredictor()
duplicate_detector = RuleBasedDuplicateDetector()
summarizer = RuleBasedSummarizer()


def analyze(title, description, category=None, department=None, candidates=()):
    classification = classifier.classify(title, description, category, department)
    model_version = "railresolve-rules-1.1.0"
    if classification.get("status") == "ML_MODEL":
        model_version += "+category-svm-1.0.0"
    return {
        "classification": classification,
        "priority": priority_predictor.predict(title, description),
        "mlPriority": shadow_prediction(title, description),
        "duplicate": duplicate_detector.detect(f"{title}. {description}", candidates),
        "summary": summarizer.summarize(title, description),
        "modelVersion": model_version,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
