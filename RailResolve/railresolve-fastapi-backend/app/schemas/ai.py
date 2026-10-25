from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.priority import PriorityPrediction

class ComplaintCandidate(BaseModel):
    complaintId: str
    text: str

class ComplaintAIRequest(BaseModel):
    complaintId: str
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1, max_length=3000)
    category: Optional[str] = None
    department: Optional[str] = None
    candidates: List[ComplaintCandidate] = Field(default_factory=list)
    trainNumber: Optional[str] = None
    coach: Optional[str] = None
    seat: Optional[str] = None

class ClassificationResult(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    department: Optional[str] = None
    confidence: float = 0.0
    status: str = "RULE_BASED"
    reason: Optional[str] = None

class PriorityResult(BaseModel):
    recommendedPriority: str
    confidence: float
    status: str = "RULE_BASED"
    reasons: List[str] = Field(default_factory=list)
    humanReviewRequired: bool = False

class DuplicateResult(BaseModel):
    isDuplicate: bool
    duplicateOf: Optional[str] = None
    similarity: float = 0.0
    status: str = "RULE_BASED"
    method: str = "token_jaccard"

class ComplaintAIResult(BaseModel):
    classification: ClassificationResult
    priority: PriorityResult
    duplicate: DuplicateResult
    summary: str
    mlPriority: Optional[PriorityPrediction] = None  # Model 2, advisory; absent when the model is unavailable
    modelVersion: str = "railresolve-ai-rules-1.0.0"
    generatedAt: str

class ComplaintAIResponse(BaseModel):
    success: bool
    analysis: Optional[ComplaintAIResult] = None
    processingTimeMs: Optional[int] = None
    status: str = "IMPLEMENTED"
    message: Optional[str] = None

class AssistantRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    context: Dict[str, Any] = Field(default_factory=dict)

class AssistantResponse(BaseModel):
    answer: str
    sources: List[str] = Field(default_factory=list)
    confidence: float = 0.0
    intent: str
    grounded: bool = True
    status: str = "RULE_BASED"

class TicketScanResponse(BaseModel):
    status: str
    extracted: Dict[str, Optional[str]] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    requiresConfirmation: bool = True
    ocrTextPreview: Optional[str] = None
    modelVersion: str = "railresolve-ticket-rules-1.0.0"


class CategoryPredictRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)

class CategoryScore(BaseModel):
    department: str
    score: float

class CategoryPredictResponse(BaseModel):
    category: Optional[str] = None
    department: Optional[str] = None
    confidence: float = 0.0
    accepted: bool = False
    status: str = "ML_MODEL"
    top: List[CategoryScore] = Field(default_factory=list)
    modelVersion: Optional[str] = None
