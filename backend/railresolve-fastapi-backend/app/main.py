# app/main.py
# FastAPI application entry point. Deliberately minimal per spec section
# 33 — this service does exactly one job (LLM processing for complaints)
# and must never grow into a second copy of the Express business backend.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, processing
from app.config import settings
from app.middleware.error_handlers import register_exception_handlers
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="RailResolve Processing Service",
    description="Internal FastAPI microservice for LLM-based complaint summarization and entity extraction.",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(processing.router)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("RailResolve FastAPI processing service starting [%s]", settings.ENVIRONMENT)
    if not settings.LLM_API_KEY:
        logger.warning("LLM_API_KEY is not set — all complaint analysis requests will fail over to FAILED status")
