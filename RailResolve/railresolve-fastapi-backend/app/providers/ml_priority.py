# app/providers/ml_priority.py
# Adapter exposing the trained priority model through the existing PriorityPredictor
# interface shape (title, description) -> dict. Kept separate from the rule-based predictor.
from app.ml.priority_model import get_priority_model
from app.providers.interfaces import PriorityPredictor


class MLPriorityPredictor(PriorityPredictor):
    def predict(self, title, description):
        model = get_priority_model()
        if model is None:
            return None
        return model.predict(title, description)
