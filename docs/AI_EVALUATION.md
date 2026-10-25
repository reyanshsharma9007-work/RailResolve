# AI Evaluation

## Executed in the final re-audit

- JavaScript syntax checks for modified Express files: passed.
- Node built-in priority/safety tests: **5/5 passed**.
- Node built-in ticket-upload validation tests: **4/4 passed**.
- FastAPI unittest suite: **16/16 passed** (before the category model was added; re-run `tests/test_ai_rules.py` and `tests/test_category_model.py` in your environment).
- Python application compilation: passed.
- FastAPI unauthorized internal endpoint test: passed with HTTP 401.
- FastAPI tests additionally cover known/unknown classification, exact/similar/unrelated/empty duplicate cases, summarization edge cases, assistant unknown/failure behavior, ticket MIME/signature/size/corruption/OCR cases, and internal authorization.

## Not executed

- Full Express Jest suite: not executable in the supplied environment; `npm test` reached the configured Jest command but the available Jest binary returned `Permission denied`.
- React/Vite production build: not executable in the supplied environment; `vite` returned `Permission denied`.
- MongoDB integration/E2E tests: no MongoDB runtime was available.
- Docker builds/runtime tests: Docker CLI/runtime unavailable.
- Kubernetes validation/deployment: kubectl/Kubernetes runtime unavailable.
- GitHub Actions: not triggered by this offline repository review.

## Complaint category model — held-out test set (254 complaints, touched once)

| Metric | Value |
|---|---|
| Macro-F1 | 0.505 |
| Accuracy | 0.677 |
| Majority-class baseline macro-F1 | 0.081 |
| Existing keyword rules, same test set (macro-F1 / accuracy) | 0.314 / 0.319 |

| Department | Precision | Recall | F1 | Test support |
|---|---|---|---|---|
| TRAIN_OPERATIONS | 0.80 | 0.87 | 0.83 | 100 |
| TRAIN_MAINTENANCE | 0.72 | 0.87 | 0.79 | 47 |
| FOOD_WATER | 0.69 | 0.79 | 0.73 | 14 |
| GENERAL_SUPPORT | 0.55 | 0.36 | 0.44 | 61 |
| BOOKING_REFUND | 0.35 | 0.50 | 0.41 | 12 |
| TICKET_TTE | 0.42 | 0.28 | 0.33 | 18 |
| STATION_MAINTENANCE | 0.00 | 0.00 | 0.00 | 2 |

Confidence gating (threshold 0.5): 69% of test complaints are auto-classified at 80% accuracy; the rest go to human review.

Caveats: small test set (per-class figures for classes with <20 samples are very uncertain; STATION_MAINTENANCE has only 2 test examples); labels come from a noisy raw `Type` column, and many of the highest-confidence "errors" are GENERAL_SUPPORT-labelled tweets that are plainly about booking or delays; the model is trained on tweets, not on form submissions. Full numbers: `training/reports/category_metrics.json`.

## Priority model (Model 2) - held-out CivicDex test (60 rows)
Accuracy 0.750, macro-F1 0.767 (95% CI 0.57-0.88); recall low 0.67 / medium 0.90 / high 0.68. Civic-domain, mostly synthetic data - not a railway or safety validation. Details: `AI_PRIORITY_MODEL.md`, `training/reports/priority_evaluation.md`.

Not available: duplicate-detection ROC/threshold metrics and summarization quality (no datasets supplied).
