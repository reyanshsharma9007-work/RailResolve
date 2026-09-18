# app/api/processing.py
# The only business-logic router in this service (spec section 33: "Keep
# FastAPI small... Do not duplicate complaint CRUD endpoints in FastAPI").
# Every route here is behind verify_internal_service_token — Express is
# the sole caller.

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.internal_auth import verify_internal_service_token
from app.schemas.complaint import (
    ComplaintProcessRequest,
    ComplaintProcessResponse,
    ProcessingStatusResponse,
)
from app.services import complaint_processor

router = APIRouter(prefix="/internal", tags=["processing"], dependencies=[Depends(verify_internal_service_token)])


@router.post("/complaints/process", response_model=ComplaintProcessResponse)
async def process_complaint(payload: ComplaintProcessRequest) -> ComplaintProcessResponse:
    """Analyzes a single complaint's text via the LLM gateway. Per the
    fail-safe contract, this endpoint returns HTTP 200 with
    success=false on AI failure — never a 500 — so a flaky LLM provider
    can never look like a broken endpoint to Express."""

    return await complaint_processor.process_complaint(payload)


@router.get("/processing/status/{complaint_id}", response_model=ProcessingStatusResponse)
async def get_processing_status(complaint_id: str) -> ProcessingStatusResponse:
    """Returns the last known processing outcome for a complaint, from
    this process's in-memory status cache. 404 if this instance has never
    processed that complaint (e.g. after a restart, or a different
    replica handled it) — Express should treat that the same as
    'no analysis yet', not as an error."""

    result = complaint_processor.get_processing_status(complaint_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No processing record found for complaint {complaint_id}",
        )
    return result
