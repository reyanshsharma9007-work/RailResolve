# app/config.py
# Centralized environment configuration, loaded once via pydantic-settings.
# Every other module imports `settings` from here instead of touching
# os.environ directly, mirroring the Express side's config/env.js pattern.

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PORT: int = 8000
    ENVIRONMENT: str = "development"

    INTERNAL_SERVICE_TOKEN: str

    LLM_BASE_URL: str = "https://api.llm-provider.com/v1"
    LLM_API_KEY: str = ""
    LLM_PRIMARY_MODEL: str = "qwen3-32b"
    LLM_FALLBACK_MODEL: str = "mistral-small-24b"
    LLM_TIMEOUT: int = 30

    ALLOWED_ORIGIN: str = "http://localhost:5000"

    # Trained complaint-category model (TF-IDF + LinearSVC). Relative paths resolve
    # against the FastAPI backend root. Missing/corrupt artifacts => rule-based fallback.
    CATEGORY_MODEL_ENABLED: bool = True
    CATEGORY_MODEL_DIR: str = "models/category"
    CATEGORY_MIN_CONFIDENCE: Optional[float] = None  # None => use value stored with the model

    # Model 2 (priority/urgency). Independent of the category settings above.
    PRIORITY_MODEL_ENABLED: bool = True
    PRIORITY_MODEL_DIR: str = "artifacts/priority"

    DUPLICATE_THRESHOLD: float = 0.72
    LOG_LEVEL: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
