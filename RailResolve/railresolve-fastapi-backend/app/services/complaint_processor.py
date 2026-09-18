# app/services/complaint_processor.py
# Orchestration layer between the /internal/complaints/process route and
# the LLM gateway. Implements the mandatory fail-safe contract (spec
# section 26): whatever happens to the LLM call, this function ALWAYS
# returns a ComplaintProcessResponse — it never raises out to the route,
# so a Qwen/Mistral outage can never turn into a 500 that Express would
# have to specially handle.
#
# Also keeps a small in-memory status record per complaintId to answer
# GET /internal/processing/status/:id without needing its own database
# (per spec section 27's "alternative implementation" note, FastAPI does
# NOT persist to MongoDB here — Express owns complaint_ai_analysis).

import time
from typing import Dict, Optional

from app.schemas.complaint import (
    AnalysisResult,
    ComplaintProcessRequest,
    ComplaintProcessResponse,
    ProcessingStatusResponse,
)
from app.services.llm_gateway import analyze_complaint
from app.utils.logger import get_logger

logger = get_logger(__name__)

# In-memory only, per the note above: this is a status cache for the
# lifetime of the process, not a system of record. If the service
# restarts, status history resets — that's acceptable since Express's
# complaint_ai_analysis collection is the durable source of truth.
_status_store: Dict[str, ProcessingStatusResponse] = {}


def _record_status(response: ProcessingStatusResponse) -> None:
    _status_store[response.complaintId] = response


def get_processing_status(complaint_id: str) -> Optional[ProcessingStatusResponse]:
    return _status_store.get(complaint_id)


async def process_complaint(payload: ComplaintProcessRequest) -> ComplaintProcessResponse:
    """Runs LLM analysis for one complaint. Guaranteed to return a
    ComplaintProcessResponse (success or failure shape) — never raises."""

    started_at = time.monotonic()

    try:
        result = await analyze_complaint(payload)

        analysis = AnalysisResult(
            summary=result.payload.summary,
            issueType=result.payload.issueType,
            station=result.payload.station,
            coach=result.payload.coach,
            seat=result.payload.seat,
            keywords=result.payload.keywords,
        )

        _record_status(
            ProcessingStatusResponse(
                complaintId=payload.complaintId,
                processingStatus="SUCCESS",
                model=result.model,
                processingTimeMs=result.elapsed_ms,
            )
        )

        logger.info("Processed complaint %s successfully via %s", payload.complaintId, result.model)

        return ComplaintProcessResponse(
            success=True,
            model=result.model,
            analysis=analysis,
            processingTimeMs=result.elapsed_ms,
        )

    except Exception as err:  # noqa: BLE001 - fail-safe boundary, see module docstring
        elapsed_ms = int((time.monotonic() - started_at) * 1000)
        failure_reason = str(err) or err.__class__.__name__

        logger.error("AI analysis failed for complaint %s: %s", payload.complaintId, failure_reason)

        _record_status(
            ProcessingStatusResponse(
                complaintId=payload.complaintId,
                processingStatus="FAILED",
                processingTimeMs=elapsed_ms,
                failureReason=failure_reason,
            )
        )

        return ComplaintProcessResponse(
            success=False,
            processingTimeMs=elapsed_ms,
            errorCode="AI_ANALYSIS_UNAVAILABLE",
            message="AI analysis is currently unavailable. The complaint workflow is unaffected.",
        )
