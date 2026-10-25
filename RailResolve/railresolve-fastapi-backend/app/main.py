from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, processing, ai, priority, model_status
from app.config import settings
from app.middleware.error_handlers import register_exception_handlers
from app.ml.category_model import load_category_model
from app.ml.priority_model import load_priority_model

@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_category_model()  # never raises; falls back to rules if artifacts are absent
    load_priority_model()  # Model 2: independent; never raises, cannot affect Model 1
    yield


app=FastAPI(title="RailResolve AI Service",version="1.1.0",lifespan=lifespan,docs_url="/docs" if not settings.is_production else None,redoc_url=None)
app.add_middleware(CORSMiddleware,allow_origins=[settings.ALLOWED_ORIGIN],allow_credentials=True,allow_methods=["GET","POST"],allow_headers=["Authorization","Content-Type"])
register_exception_handlers(app)
app.include_router(health.router)
app.include_router(processing.router)
app.include_router(ai.router)
app.include_router(priority.router)
app.include_router(model_status.router)
