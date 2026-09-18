# RailResolve — FastAPI Processing Service (Part 2)

The Python/FastAPI **AI processing microservice**: it summarizes complaint
text and extracts structured entities (train number, station, coach, seat)
via an LLM, and nothing else. It never touches user auth, RBAC, the
complaint state machine, SLA logic, or MongoDB directly — that's all
owned by the Express backend (Part 1). This service is deliberately small
per the PRD's dual-backend design.

## Stack
FastAPI, Pydantic v2, httpx (async), uvicorn.

## Folder structure

```
app/
  main.py                     FastAPI app assembly, CORS, exception handlers, routers
  config.py                   Settings (pydantic-settings), loaded once from .env
  api/
    health.py                 GET /health (public, unauthenticated)
    processing.py             POST /internal/complaints/process
                               GET  /internal/processing/status/{id}
  services/
    llm_gateway.py             ONLY module that knows LLM_API_KEY / provider shape.
                                Qwen3 (primary) -> Mistral (fallback) on ANY failure.
    complaint_processor.py     Orchestrates the gateway call; guarantees a response
                                is always returned, never an unhandled exception.
  schemas/
    complaint.py                Pydantic models: the Express<->FastAPI contract,
                                 the strict LLM-output shape, and zero-invention rules
  middleware/
    internal_auth.py            Bearer token dependency (INTERNAL_SERVICE_TOKEN)
    error_handlers.py           Consistent { success, message, errorCode } envelope
  utils/
    logger.py                   Shared logging config
```

## Setup

```bash
cp .env.example .env
# Set INTERNAL_SERVICE_TOKEN to the SAME value as Express's .env
# Set LLM_API_KEY / LLM_BASE_URL to your real provider
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs at `http://localhost:8000/docs` (disabled automatically
when `ENVIRONMENT=production`).

## Contract with Express (verified working)

**Request** (`POST /internal/complaints/process`, `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`):
```json
{ "complaintId": "...", "title": "...", "description": "...", "trainNumber": null, "coach": "B2", "seat": "42" }
```

**Success response** — `200`:
```json
{ "success": true, "model": "qwen3-32b", "analysis": { "summary": "...", "issueType": "...", "station": null, "coach": "B2", "seat": "42", "keywords": [...] }, "processingTimeMs": 680 }
```

**Failure response — also `200`, never `500`** (mandatory fail-safe contract):
```json
{ "success": false, "errorCode": "AI_ANALYSIS_UNAVAILABLE", "message": "AI analysis is currently unavailable. The complaint workflow is unaffected." }
```

Express reads `success` to decide whether to store a `SUCCESS` or `FAILED`
`complaint_ai_analysis` record — it never needs to special-case a 5xx from
this service.

## Guardrails implemented and tested

- **No system authority**: the LLM's output schema (`LlmAnalysisPayload`)
  has no field that could select a department, change a status, assign an
  officer, or trigger any write — structurally impossible, not just
  prompted against.
- **Zero invention**: the system prompt instructs — and `ExtractedEntities`
  allows — `null` for any field not present in the passenger's text.
  Verified: a mocked response with `station=None` round-trips as `null`,
  never backfilled.
- **Primary/fallback, no retry storm**: Qwen3 is tried once; on any
  exception (timeout, non-2xx, malformed JSON, schema mismatch), Mistral
  is tried once. No loops, no multi-model voting, per spec section 20.
- **Fail-safe HTTP contract**: verified that when both models fail (e.g.
  provider unreachable), the endpoint still returns `200` with
  `success: false` — never a `500` that Express would need special
  handling for.
- **Internal-only access**: every `/internal/*` route requires
  `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`, checked in
  `middleware/internal_auth.py`. `/health` is intentionally public.
- **No duplicate CRUD**: this service does not read/write complaints,
  users, or any collection Express owns — it is stateless aside from an
  in-memory processing-status cache used only to answer
  `GET /internal/processing/status/:id`.

## Testing performed before delivery

Ran via FastAPI's `TestClient` (in-process, no external calls):
1. `GET /health` → `200`, correctly reports LLM unreachable when no API key set
2. Missing auth header → `401`
3. Wrong token → `401`
4. Real LLM outage (no provider configured) → primary fails, fallback
   attempted, both fail → **`200` with `success: false`** (fail-safe verified)
5. `GET /internal/processing/status/:id` reflects the `FAILED` outcome
6. Status lookup for an unknown complaint → `404` (not treated as an error)
7. Blank `description` in request body → `422` with a clear field message
8. Mocked successful Qwen3 response → `200`, `success: true`, and a
   not-mentioned field (`station`) correctly stays `null` end-to-end
