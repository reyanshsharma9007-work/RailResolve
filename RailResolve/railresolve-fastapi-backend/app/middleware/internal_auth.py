# app/middleware/internal_auth.py
# FastAPI dependency enforcing the shared-secret Bearer token on every
# /internal/* route (spec section 28). Express is the only caller; this
# is not user-facing JWT auth — that concern belongs entirely to Express.

from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_internal_service_token(authorization: str = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.split(" ", 1)[1]

    if token != settings.INTERNAL_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service token",
        )
