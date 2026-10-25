# Model 2 work: baseline report, Model 1 protection, changed files

## A. Baseline (recorded before any change)
**Architecture.** React frontend -> Express (auth, complaints, SLA, final priority policy) -> FastAPI (`/internal/*`, shared bearer token) for ML. Express calls `POST /internal/ai/analyze` after each complaint submission (fire-and-forget, `aiProcessing.service.js`) and for the "AI suggestions" preview (`ai.controller.js`).
**Model 1.** `models/category/` (TF-IDF + LinearSVC, `category-svm-1.0.0`, calibrated margin confidence, threshold 0.5) loaded by `app/ml/category_model.py` with SHA-256 checks; `HybridCategoryClassifier` (`app/providers/ml_category.py`): explicit cleanliness override -> ML if confident -> HUMAN_REVIEW_REQUIRED if not -> rules if no model.
**Endpoints.** `/health`, `/internal/complaints/process`, `/internal/processing/status/{id}`, `/internal/ai/analyze`, `/internal/ai/predict-category`, `/internal/ai/assistant`, `/internal/ai/ticket-scan`.
**Containers.** One Dockerfile per service + k8s manifests (`k8s/`); **no docker-compose file exists**. FastAPI image copies only `app/`; `.dockerignore` excludes `models/`.
**Baseline test results (as run):** shipped suite `tests.test_ai_rules` + `tests.test_category_model`: 2 errors - FastAPI/pydantic are not installable offline in the sandbox (import errors, not logic failures). With `app.config` stubbed: `tests.test_category_model` 14 run, OK (4 skipped: endpoint tests need FastAPI). Express: jest not installed; the 5 priority tests ran via a minimal shim: 5/5 pass. Docker not installed.
**Recorded Model 1 snapshot:** 16 representative cases (raw model, hybrid, `/analyze`) -> `tests/fixtures/model1_baseline.json`; artifact SHA-256s -> `tests/fixtures/model1_artifact_checksums.json`.

## B. Model 1 protection - verification results (after Model 2)
| Check | Result |
|---|---|
| Model 1 artifacts (4 files) byte-identical to baseline | **identical** |
| Files unchanged vs baseline: `ml_category.py`, `rule_based.py`, `category_model.py`, `text_cleaning.py`, `api/ai.py`, `train_category_model.py`, `requirements.txt` | **unchanged** |
| Whole Express tree and whole frontend `src/` tree | **unchanged** |
| 16-case snapshot (raw model, hybrid, `/analyze` minus new `mlPriority`) vs baseline | **0 differences** |
| Cleanliness override | passes (`test_cleanliness_override_still_applies`) |
| Hybrid classification identical with Model 2 on vs unavailable | passes |
| Model 2 load failure does not affect Model 1 | passes |
| `tests.test_model1_regression` | 7 run, OK |
| `tests.test_category_model` (unchanged) | 14 run, OK (4 skipped: need FastAPI) |
| `tests.test_priority_model` | 29 run, OK (6 skipped: need FastAPI) |
| `tests.test_ai_rules` (unchanged) | still errors in the sandbox exactly as in the baseline (FastAPI not installed) - **not executed successfully here; run it in your environment** |
| Verification inside a rebuilt container | **not possible** (no Docker). Layout simulated instead - see C.4 |

Commands: `python3 /home/claude/w/tools/run_tests.py tests.test_priority_model tests.test_model1_regression tests.test_category_model` (sandbox wrapper that stubs `app.config`; in a normal environment use `python -m unittest ...`).

## C. Items needing your decision
1. **Model 1 is not in the FastAPI image today.** `.dockerignore` excludes `models/` and the Dockerfile copies only `app/`, so a container build falls back to the rule-based classifier. This predates Model 2. I did **not** change it (it would change deployed Model 1 behaviour, which you told me to freeze). To fix: delete the `models/` line from `.dockerignore` and add `COPY models ./models` to the Dockerfile. `GET /health/models` now shows `category.ready` so you can see this.
2. **`.env.example` contains a real-looking `INTERNAL_SERVICE_TOKEN`** in the FastAPI backend (and the uploaded zip contains both `.env` files). Rotate that token and replace the example value with a placeholder. The zip I return omits both `.env` files.
3. **Shadow mode** (Model 2 advisory, rule-based `priority` still authoritative) - see `AI_PRIORITY_MODEL.md` section 2. Persisting `mlPriority` in Express is optional and not done.
4. **Container check (simulated):** copying only `app/` + `artifacts/` (what the Dockerfile copies) into an empty directory and starting the loader gave `priority: READY`, `category: not loaded`. A real `docker build` / smoke test was not possible.

## D. Not executed here (blockers)
FastAPI/pydantic cannot be installed offline: **all endpoint tests (`TestClient`) are written but were skipped**; endpoint/schema code was only byte-compiled and reviewed. Express integration tests (jest, Mongo) and Docker build/run were not possible. The CivicDex license page could not be fetched. Please run the full suite and a container smoke test before merging.

## E. Changed files and why
**Shared files modified (all additive, smallest possible):**
| File | Change | Why |
|---|---|---|
| `app/config.py` | + `PRIORITY_MODEL_ENABLED`, `PRIORITY_MODEL_DIR` | externalised Model 2 settings |
| `app/main.py` | register 2 routers; call `load_priority_model()` in lifespan after Model 1's loader | serve and load Model 2 independently |
| `app/schemas/ai.py` | + optional `mlPriority` on `ComplaintAIResult` (+ import) | expose advisory result in `/analyze` |
| `app/services/rail_ai.py` | + one key `mlPriority` (+ import); Model 1 and rule-based lines untouched | attach advisory result |
| `Dockerfile` | + `COPY artifacts ./artifacts` | bundle Model 2 artifact |
| `.env.example` | + 2 variables (appended; existing lines untouched) | document settings |

**New files (FastAPI backend):** `app/ml/priority_model.py`, `app/ml/priority_text.py`, `app/providers/ml_priority.py`, `app/services/priority_service.py`, `app/schemas/priority.py`, `app/api/priority.py`, `app/api/model_status.py`, `training/priority_common.py`, `training/prepare_priority_dataset.py`, `training/train_priority_model.py`, `training/evaluate_priority_model.py`, `training/reports/priority_{dataset_audit.md,dataset_audit.json,model_selection.json,metrics.json,evaluation.md}`, `artifacts/priority/{priority-1.0.0.joblib,metadata.json}`, `tests/test_priority_model.py`, `tests/test_model1_regression.py`, `tests/fixtures/{model1_baseline.json,model1_artifact_checksums.json}`.
**Docs:** new `docs/AI_PRIORITY_MODEL.md`, this file; updated rows in `AI_STATUS.md`, `AI_TRAINING.md`, `AI_EVALUATION.md`, `AI_DATASET_MAPPING.md`.
**No dependency changes** (scikit-learn, joblib, numpy, scipy were already pinned for Model 1).
**Not changed:** Express, frontend, Model 1 files/artifacts, k8s manifests, CI workflow.
