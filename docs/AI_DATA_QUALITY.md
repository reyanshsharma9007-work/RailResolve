# AI Data Quality

No ML dataset was available in the uploaded project ZIP, so no fabricated data-quality statistics are reported.

Required future checks:
1. SHA-256 before processing.
2. Row/record count and schema.
3. Missing-value profile.
4. Exact and near duplicate checks.
5. Label distribution.
6. PII detection/redaction for phone numbers, emails, URLs, handles, PNR-like identifiers and unnecessary account IDs.
7. Group/component-aware splitting where records are related.
8. Train 75%, validation 15%, test 10%.
9. Preserve the test set until final evaluation.
10. Keep raw data byte-for-byte unchanged.
