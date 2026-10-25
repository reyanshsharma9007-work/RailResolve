# AI Security

- Express AI routes require authentication and passenger role authorization.
- FastAPI `/internal/ai/*` routes require the internal Bearer service token.
- Passenger assistant context is queried with `passengerId = authenticated user`; another passenger's complaints/journeys are not included.
- Ticket uploads are memory-buffered, size-limited, MIME-filtered, and signature-validated before being sent to FastAPI.
- Ticket extraction is never automatically persisted as a journey or ticket record; user confirmation remains required.
- JWT and internal service credentials are environment variables, not source-code secrets.
- AI failures do not expose FastAPI internals to the passenger.
- No raw datasets or private ticket images are included in production images.

- AI preview/assistant endpoints and ticket scanning are authenticated and passenger-role protected.
- AI preview and assistant requests use an Express rate limiter; ticket scanning has a stricter dedicated rate limiter.
- The authenticated passenger ID is the only source for assistant complaint/journey context.
- FastAPI internal routes accept only the shared internal Bearer token.

- FastAPI independently validates ticket MIME type, binary signature, maximum size, image readability, and PDF readability; ordinary OCR/extraction failures return safe `FAILED`/`DATA_PENDING` responses rather than internal OCR exceptions.
- Assistant provider failures are converted to a safe 503 contract by both FastAPI and Express.
