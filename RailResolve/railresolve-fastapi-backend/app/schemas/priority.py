from typing import Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class PriorityPredictRequest(BaseModel):
    """Either `text`, or `title` and/or `description` (combined exactly as in training)."""
    text: Optional[str] = Field(default=None, max_length=3150)
    title: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = Field(default=None, max_length=3000)

    @model_validator(mode="after")
    def _non_empty(self):
        if not any((v or "").strip() for v in (self.text, self.title, self.description)):
            raise ValueError("provide non-empty text, or a title/description")
        return self

    def combined(self) -> tuple[str, str]:
        if (self.text or "").strip():
            return "", self.text
        return self.title or "", self.description or ""


class SafetyRuleInfo(BaseModel):
    triggered: bool = False
    priority: Optional[str] = None
    matched: List[str] = Field(default_factory=list)
    source: str = "RuleBasedPriorityPredictor (explicit safety terms)"


class PriorityPrediction(BaseModel):
    status: str  # ML_MODEL | NO_USABLE_TEXT
    modelVersion: Optional[str] = None
    predictedUrgency: Optional[str] = None            # exact label from the training data (low/medium/high)
    recommendedPriority: Optional[str] = None         # same label in RailResolve's enum (LOW/MEDIUM/HIGH)
    confidence: Optional[float] = None                # only when the model's probabilities are supported
    confidenceKind: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None
    effectivePriority: Optional[str] = None           # max(model, explicit safety rule) - never below a safety rule
    safetyRule: SafetyRuleInfo = Field(default_factory=SafetyRuleInfo)
    vocabularyCoverage: Optional[float] = None
    lowCoverage: bool = False
    advisoryOnly: bool = True
    warnings: List[str] = Field(default_factory=list)
