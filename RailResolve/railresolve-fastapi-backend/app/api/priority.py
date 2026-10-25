# app/api/priority.py - Model 2 endpoint. Same prefix, auth and error conventions as app/api/ai.py.
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.internal_auth import verify_internal_service_token
from app.schemas.priority import PriorityPrediction, PriorityPredictRequest
from app.services.priority_service import predict_priority

router = APIRouter(prefix="/internal/ai", tags=["ai-priority"], dependencies=[Depends(verify_internal_service_token)])


@router.post("/predict-priority", response_model=PriorityPrediction)
async def predict_priority_endpoint(payload: PriorityPredictRequest):
    title, description = payload.combined()
    try:
        result = predict_priority(title, description)
    except Exception:  # noqa: BLE001 - do not leak internals
        raise HTTPException(status_code=503, detail="Priority prediction failed safely.")
    if result is None:
        raise HTTPException(status_code=503, detail="Priority model is not available.")
    return result
