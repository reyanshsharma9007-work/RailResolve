# AI Architecture

React calls Express only. Express authenticates/authorizes and proxies AI requests to FastAPI using `INTERNAL_SERVICE_TOKEN`.

FastAPI exposes:
- `/health`
- `/internal/ai/analyze`
- `/internal/ai/assistant`
- `/internal/ai/ticket-scan`

## Provider architecture

Each AI capability has a replaceable provider boundary:

- `Classifier`
  - current: `RuleBasedClassifier`
- `PriorityPredictor`
  - current: `RuleBasedPriorityPredictor`
- `DuplicateDetector`
  - current: `RuleBasedDuplicateDetector` (`RULE_BASED_BASELINE`, token Jaccard)
- `Summarizer`
  - current: `RuleBasedSummarizer`
- `AssistantProvider`
  - current: `RuleBasedAssistantProvider`
  - extension points: `RAGProvider`, `LLMProvider`
- `TicketExtractor`
  - current: `RuleBasedTicketExtractor`

The Express API and React API client do not need to change when a provider is replaced.

## Priority safety

The passenger-submitted priority is stored as an informational/audit field only. It is not an input to the final-priority calculation.

The backend computes final priority from safety/business rules. AI can recommend CRITICAL, but AI alone cannot produce final CRITICAL. A qualifying safety rule or explicit human escalation is required. SLA due dates are calculated only from the backend-owned final priority.

## AI availability

Complaint creation is synchronous only with respect to the core complaint transaction. AI analysis is launched asynchronously. A missing/unavailable FastAPI service therefore does not prevent complaint creation. The existing `ComplaintAiAnalysis` record is marked `PENDING`, then `SUCCESS` or `FAILED`.

## Ticket scanner

Ticket scanning is OCR/document extraction only in the current implementation. Express validates MIME type, file size, and file signature. FastAPI performs OCR/PDF extraction and regex field extraction. The scanner returns `requiresConfirmation=true`; it does not persist extracted ticket information.

Docker installs Tesseract (`tesseract-ocr`) plus the Python Pillow and pytesseract dependencies required by image OCR. No railway-ticket ML training is claimed.

## Analysis persistence

`ComplaintAiAnalysis` remains the single AI-analysis collection. It stores the provider/model version, classification fields, AI priority recommendation, authoritative final priority plus its source/reason, duplicate result, summary, processing status, timing, and failure reason.

When asynchronous AI processing changes the authoritative final priority, the SLA due date is recalculated. If the final priority is unchanged, the existing SLA due date is retained.

## Ticket confirmation workflow

The React ticket scanner only scans and displays editable extracted fields. It never creates a journey automatically. The passenger must explicitly select/resolve valid train and station records, review the editable PNR/date/coach/seat fields, and press **Confirm & Create Journey**. That action calls the existing authenticated `POST /api/journeys` API, so the existing journey validation remains authoritative. The uploaded ticket bytes are not persisted by the scanner.

## Assistant failure contract

Express converts FastAPI connection failures, timeouts, provider errors, and malformed assistant responses into:

`success: false`, `errorCode: AI_SERVICE_UNAVAILABLE`, and a safe user-facing message.

No FastAPI URL, stack trace, or provider exception is returned to the passenger.
