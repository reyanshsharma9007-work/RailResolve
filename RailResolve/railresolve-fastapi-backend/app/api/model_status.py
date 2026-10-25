# app/api/model_status.py - public, secret-free readiness for each model INDEPENDENTLY.
from fastapi import APIRouter

from app.ml.category_model import get_category_model
from app.ml.priority_model import priority_model_status

router = APIRouter(tags=["health"])


@router.get("/health/models")
async def models_health():
    category = get_category_model()
    return {
        "category": {"ready": category is not None, "version": getattr(category, "version", None)},
        "priority": priority_model_status(),
    }
