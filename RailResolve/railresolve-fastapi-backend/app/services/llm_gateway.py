# app/services/llm_gateway.py
# Owns all outbound communication with the external LLM provider. This is
# the ONLY module in the service that knows the LLM_API_KEY or the
# provider's HTTP shape — everything else deals in the ComplaintProcessRequest
# / LlmAnalysisPayload contract from app/schemas/complaint.py.
#
# Fallback rule per spec section 20: "Do not build a complicated
# model-selection system." Mistral Small 24B is tried ONLY if the primary
# Qwen3 call raises (timeout, connection error, non-2xx, or bad JSON) —
# there is no retry loop, no cost-based routing, no multi-model voting.

import json
import time
from typing import Optional

import httpx

from app.config import settings
from app.schemas.complaint import ComplaintProcessRequest, LlmAnalysisPayload
from app.utils.logger import get_logger

logger = get_logger(__name__)


class LlmCallResult:
    """Return value of a completed (successful) LLM call: which model
    answered, the validated payload, and how long it took."""

    def __init__(self, model: str, payload: LlmAnalysisPayload, elapsed_ms: int):
        self.model = model
        self.payload = payload
        self.elapsed_ms = elapsed_ms


SYSTEM_PROMPT = """You are a railway complaint analysis assistant. You are given a \
passenger's complaint title and description. Respond with ONLY a single JSON object \
(no markdown fences, no commentary) matching exactly this shape:

{
  "summary": "<one sentence summary of the issue>",
  "issueType": "<short issue category, e.g. 'AC Malfunction'>",
  "trainNumber": <string or null>,
  "station": <string or null>,
  "coach": <string or null>,
  "seat": <string or null>,
  "keywords": [<3 to 6 short keyword strings>]
}

Rules you MUST follow:
- You are a read-only text analysis tool. You cannot and must not attempt to change \
any system state, status, department, assignment, or user role. Only return the JSON object.
- If a field (trainNumber, station, coach, seat) is not explicitly present in the \
passenger's text, its value MUST be null. NEVER guess or invent a value.
- Output must be valid JSON and nothing else."""


def _build_user_prompt(payload: ComplaintProcessRequest) -> str:
    known_context = []
    if payload.trainNumber:
        known_context.append(f"Known train number (from journey record): {payload.trainNumber}")
    if payload.coach:
        known_context.append(f"Known coach (from journey record): {payload.coach}")
    if payload.seat:
        known_context.append(f"Known seat (from journey record): {payload.seat}")
    context_block = "\n".join(known_context)

    return (
        f"Title: {payload.title}\n"
        f"Description: {payload.description}\n"
        f"{context_block}\n\n"
        "Only include trainNumber/coach/seat in your JSON if the passenger's own text "
        "mentions them, OR if given above as known context. Otherwise use null."
    )


def _parse_llm_json(raw_text: str) -> LlmAnalysisPayload:
    """Strictly parses and validates the LLM's raw text output. Any
    malformed JSON or schema mismatch raises — the caller treats that
    exactly like a network failure (falls back / marks FAILED)."""

    cleaned = raw_text.strip()
    # Defensive: strip accidental markdown code fences some models add
    # despite instructions not to.
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    data = json.loads(cleaned)
    return LlmAnalysisPayload.model_validate(data)


async def _call_model(client: httpx.AsyncClient, model_name: str, payload: ComplaintProcessRequest) -> LlmAnalysisPayload:
    """Makes one chat-completion call to the configured LLM provider using
    an OpenAI-compatible /chat/completions shape (the common denominator
    for Qwen3/Mistral-style hosted endpoints)."""

    response = await client.post(
        f"{settings.LLM_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(payload)},
            ],
            "temperature": 0.2,
            "max_tokens": 500,
        },
        timeout=settings.LLM_TIMEOUT,
    )
    response.raise_for_status()

    body = response.json()
    raw_content = body["choices"][0]["message"]["content"]

    return _parse_llm_json(raw_content)


async def analyze_complaint(payload: ComplaintProcessRequest) -> LlmCallResult:
    """Tries the primary model (Qwen3); on ANY failure, tries the fallback
    (Mistral) exactly once. If both fail, raises — the caller
    (complaint_processor.py) is responsible for turning that into a
    FAILED processing record rather than propagating a 500 to Express."""

    started_at = time.monotonic()

    async with httpx.AsyncClient() as client:
        try:
            result = await _call_model(client, settings.LLM_PRIMARY_MODEL, payload)
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            return LlmCallResult(model=settings.LLM_PRIMARY_MODEL, payload=result, elapsed_ms=elapsed_ms)
        except Exception as primary_error:  # noqa: BLE001 - intentionally broad, see docstring
            logger.warning(
                "Primary model '%s' failed (%s), attempting fallback '%s'",
                settings.LLM_PRIMARY_MODEL,
                primary_error,
                settings.LLM_FALLBACK_MODEL,
            )

            try:
                result = await _call_model(client, settings.LLM_FALLBACK_MODEL, payload)
                elapsed_ms = int((time.monotonic() - started_at) * 1000)
                return LlmCallResult(model=settings.LLM_FALLBACK_MODEL, payload=result, elapsed_ms=elapsed_ms)
            except Exception as fallback_error:  # noqa: BLE001
                logger.error(
                    "Fallback model '%s' also failed (%s)", settings.LLM_FALLBACK_MODEL, fallback_error
                )
                raise fallback_error from primary_error


async def check_provider_reachable() -> Optional[bool]:
    """Lightweight reachability probe for GET /health. Returns None if the
    check itself couldn't be attempted (e.g. no API key configured)."""

    if not settings.LLM_API_KEY:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.LLM_BASE_URL}/models",
                headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                timeout=5,
            )
            return response.status_code < 500
    except Exception:  # noqa: BLE001
        return False
