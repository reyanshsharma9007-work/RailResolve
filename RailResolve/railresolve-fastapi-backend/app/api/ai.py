import time
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from app.middleware.internal_auth import verify_internal_service_token
from app.schemas.ai import *
from app.config import settings
from app.ml.category_model import DEPARTMENT_NAMES, get_category_model
from app.services.rail_ai import analyze
from app.services.assistant import answer_question
from app.services.ticket_scanner import ocr_bytes, extract_ticket_fields

router = APIRouter(
    prefix="/internal/ai",
    tags=["ai"],
    dependencies=[Depends(verify_internal_service_token)],
)


@router.post("/analyze", response_model=ComplaintAIResponse)
async def analyze_complaint(payload: ComplaintAIRequest):
    started = time.monotonic()
    try:
        result = analyze(
            payload.title,
            payload.description,
            payload.category,
            payload.department,
            payload.candidates,
        )
        return ComplaintAIResponse(
            success=True,
            analysis=result,
            processingTimeMs=int((time.monotonic() - started) * 1000),
        )
    except Exception:
        return ComplaintAIResponse(
            success=False,
            status="FAILED",
            message="AI analysis failed safely.",
            processingTimeMs=int((time.monotonic() - started) * 1000),
        )


@router.post("/assistant", response_model=AssistantResponse)
async def assistant(payload: AssistantRequest):
    try:
        return answer_question(payload.question, payload.context)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="AI Assistant is currently unavailable. Please try again.",
        )


@router.post("/ticket-scan", response_model=TicketScanResponse)
async def ticket_scan(file: UploadFile = File(...)):
    # Read only one byte beyond the service limit so a hostile oversized
    # upload cannot be copied into memory without bound before validation.
    max_bytes = 10 * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="Ticket file is too large.")
    text, warnings, status = ocr_bytes(data, file.content_type or "")
    fields = extract_ticket_fields(text) if text else {}

    return TicketScanResponse(
        status=status,
        extracted=fields,
        warnings=warnings,
        requiresConfirmation=True,
        ocrTextPreview=text[:1000] if text else None,
    )


@router.post("/predict-category", response_model=CategoryPredictResponse)
async def predict_category(payload: CategoryPredictRequest):
    """Raw ML department prediction for a complaint text. `accepted` says whether
    the calibrated confidence clears the threshold /analyze would use."""
    model = get_category_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Category model is not available.")
    prediction = model.predict(payload.text)
    if prediction is None:
        return CategoryPredictResponse(status="NO_USABLE_TEXT")
    threshold = settings.CATEGORY_MIN_CONFIDENCE
    if threshold is None:
        threshold = model.default_min_confidence
    accepted = prediction["confidence"] >= threshold
    dept = prediction["department"]
    return CategoryPredictResponse(
        category=DEPARTMENT_NAMES.get(dept, dept), department=dept,
        confidence=prediction["confidence"], accepted=accepted,
        status="ML_MODEL" if accepted else "LOW_CONFIDENCE",
        top=[CategoryScore(**t) for t in prediction["top"]],
        modelVersion=prediction["modelVersion"],
    )
