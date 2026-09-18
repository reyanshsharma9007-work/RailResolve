# app/api/health.py
# Public, unauthenticated health check (spec section 33). Deliberately
# outside verify_internal_service_token so uptime monitors and Express's
# own startup checks can hit it without a token.

from fastapi import APIRouter

from app.config import settings
from app.schemas.complaint import HealthResponse
from app.services.llm_gateway import check_provider_reachable

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    llm_reachable = await check_provider_reachable()
    return HealthResponse(
        status="ok",
        llmProviderReachable=llm_reachable,
        environment=settings.ENVIRONMENT,
    )
