# AI Dataset Audit

## Result

The supplied `FINAL_RAILRESOLVE_COMPLETE_PROJECT.zip` was inspected recursively. It contains the application repository and Git metadata, but no CSV, JSONL, Parquet, XLSX, ticket-image dataset, or separate dataset ZIP.

Therefore the following requested datasets are **not available in this delivery**:
- Indian railway complaint tweets
- Indian Railways Q&A
- Quora duplicate questions
- customer-support summarization data
- customer-support conversation data
- banking/customer-support Parquet data

This is explicitly **DATA_PENDING**. Raw data has not been fabricated or modified.

## Raw/processed policy

The repository now reserves:
- `datasets/raw/`
- `datasets/processed/`

No raw data has been copied into either directory.

When datasets are supplied, the audit pipeline must record SHA-256, row count, columns, missingness, duplicates, class distribution, PII findings, transformations, filters, and 75/15/10 grouped splits as applicable.
