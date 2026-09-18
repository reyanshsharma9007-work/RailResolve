# app/schemas/complaint.py
# Pydantic models defining the Express <-> FastAPI contract (spec section
# 27) plus the strict shape the LLM's own JSON output must conform to
# before it's ever trusted or returned. Any LLM output that fails this
# validation is treated as a processing failure, never passed through.

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class ComplaintProcessRequest(BaseModel):
    """Body Express sends to POST /internal/complaints/process."""

    complaintId: str
    title: str
    description: str
    trainNumber: Optional[str] = None
    coach: Optional[str] = None
    seat: Optional[str] = None

    @field_validator("title", "description")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("must not be blank")
        return value


class ExtractedEntities(BaseModel):
    """Zero-invention entity extraction: any field the LLM could not find
    in the passenger's text MUST be null, never guessed (spec section 23)."""

    trainNumber: Optional[str] = None
    station: Optional[str] = None
    coach: Optional[str] = None
    seat: Optional[str] = None


class LlmAnalysisPayload(BaseModel):
    """The strict shape we require from the LLM's raw JSON output before
    it is trusted. Pydantic validation here is the enforcement point for
    'the LLM only returns structured analysis' (spec section 24) — this
    model has no field that could carry a command, status, or DB write."""

    summary: str
    issueType: str
    trainNumber: Optional[str] = None
    station: Optional[str] = None
    coach: Optional[str] = None
    seat: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    """The `analysis` object returned to Express on success."""

    summary: str
    issueType: str
    station: Optional[str] = None
    coach: Optional[str] = None
    seat: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)


class ComplaintProcessResponse(BaseModel):
    """Full response body for POST /internal/complaints/process."""

    success: bool
    model: Optional[str] = None
    analysis: Optional[AnalysisResult] = None
    processingTimeMs: Optional[int] = None
    errorCode: Optional[str] = None
    message: Optional[str] = None


class ProcessingStatusResponse(BaseModel):
    """Response body for GET /internal/processing/status/:id."""

    complaintId: str
    processingStatus: str  # SUCCESS | FAILED | PENDING
    model: Optional[str] = None
    processingTimeMs: Optional[int] = None
    failureReason: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    llmProviderReachable: Optional[bool] = None
    environment: str
