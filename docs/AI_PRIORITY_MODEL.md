# Model 2 - Priority / Urgency prediction (`priority-1.0.0`)

**Status: trained, evaluated, integrated as an ADVISORY (shadow) signal. Not validated on railway data.**

## 1. Architecture and responsibilities
- **Express** owns business logic and the *final* priority/SLA decision (`priority.service.js`: explicit safety terms win; AI `CRITICAL` alone is rejected). **Unchanged.**
- **FastAPI** owns ML inference. Express already sends every submitted complaint and every "AI suggestion" preview to `POST /internal/ai/analyze`, so Model 2 is exposed there without any Express change.
- **Model 1** (category SVM + hybrid classifier) and **Model 2** are separate modules with separate artifacts, settings and load state:

| | Model 1 (category) | Model 2 (priority) |
|---|---|---|
| Artifact dir | `models/category/` | `artifacts/priority/` |
| Loader | `app/ml/category_model.py` | `app/ml/priority_model.py` |
| Text prep | `app/ml/text_cleaning.py` | `app/ml/priority_text.py` |
| Provider / service | `app/providers/ml_category.py` | `app/providers/ml_priority.py`, `app/services/priority_service.py` |
| Raw endpoint | `POST /internal/ai/predict-category` | `POST /internal/ai/predict-priority` |
| In `/analyze` | `classification` (hybrid, cleanliness override) | `mlPriority` (new, optional) |
| Settings | `CATEGORY_MODEL_*` | `PRIORITY_MODEL_*` |
| Training | `training/train_category_model.py` | `training/{prepare,train,evaluate}_priority_model.py` |

## 2. Integration decision (hybrid handling and safety)
Chosen: **Model 2 runs alongside the existing rule-based predictor; it does not replace it.**
- `/analyze` still returns `priority` from `RuleBasedPriorityPredictor` exactly as before. Model 2's output is added as the new optional key `mlPriority`. Express ignores unknown keys, so its behaviour and stored data are unchanged.
- `mlPriority.effectivePriority = max(model label, explicit safety rule)`. The explicit rules are the *existing* ones in `rule_based.py` (reused, not copied). A low label or low confidence from the model can never lower a complaint that matches an explicit safety term.
- Model 2 never emits `CRITICAL` (no such label in CivicDex). `CRITICAL` can only come from explicit rules, and Express keeps the final word.
- **Why advisory:** the training data is Chennai civic requests, not railway complaints; the model under-triages real hazards (see section 6); no railway labels exist to validate it. Promoting it to primary requires a labelled railway validation set first.

## 3. Dataset
- **CivicDex** (`JadeSamLee/civicdex`), supplied as `civicdex_main.csv` (600 rows, used for training) and `civicdex_adapted.csv` (main + 60 extra rows of undocumented origin, all `train`; used only in an ablation). The Hugging Face page could not be opened (no network at training time).
- **License: not verified** - confirm before commercial use.
- 14 columns as expected. **Chennai civic services**; 56% of `raw_text` in Tamil script; `source_type`: 446 synthetic_realistic / 92 synthetic / 62 real. `urgency` = `low` 82 / `medium` 257 / `high` 261 (**no critical**). Predefined split 480/60/60 (respected).
- Defects found: `locality` holds `real` in 18 rows (shifted column); 44 duplicate normalised glosses, 5/9/4 cross-split overlaps; `severity` vocabulary drifts to 12 values in the adapted file.
- Full audit: `training/reports/priority_dataset_audit.md` (generated).

## 4. Target and inputs
- **Target:** `urgency` -> `low | medium | high` (lower-case in the artifact; mapped 1:1 to `LOW/MEDIUM/HIGH` in `recommendedPriority`).
- **Input:** `english_gloss` (normalised). Compared by CV against `normalized_text` and `raw_text`: macro-F1 0.810 vs 0.753 vs 0.773; and it is the only English field, which matches RailResolve's inputs.
- **Severity** was analysed separately and is **not** used: it describes kind of issue (hazard/failure/delay/info), not a ranked scale, and predicts urgency 78% on its own (label leakage). `severity`, `intent`, `category`, `department` are excluded from features.

## 5. Training, selection, evaluation
- Cleaning (all counted): 0 missing/invalid, 0 conflicting duplicates in train+val, 36 exact duplicates removed from train+val; test rows never dropped, 8 of 60 flagged as duplicating train/val.
- Selection: 5-fold StratifiedGroupKFold (group = normalised text) x 3 seeds on train+val (504 rows), seed 42. The test split is not read until `evaluate_priority_model`.
- Grid: {logistic regression, linear SVM} x {word 1-2-gram, word+char} x {no weights, balanced} x 4 values of C. Best LR 0.810 vs best SVM 0.809 CV macro-F1: a tie, so **logistic regression** (native probabilities) was chosen: `TF-IDF word 1-2gram + LogisticRegression(C=3, class_weight=balanced)`.
- Adding the 60 unverified `adapted` rows to training folds: 0.817 vs 0.810 - within noise, so **not used**.
- Probabilities: out-of-fold ECE 0.116 / log-loss 0.500 (plain) vs 0.063 / 0.455 (sigmoid-calibrated, no-skill log-loss = 1.099). Calibrated version shipped (`probability_kind: calibrated_sigmoid`). Calibration is estimated on ~500 rows; treat confidence as approximate.

**Held-out test (60 rows, evaluated once, artifact SHA-256 verified):**

| | Value (95% bootstrap CI) |
|---|---|
| Accuracy | 0.750 (0.633-0.850) |
| Macro-F1 | 0.767 (0.570-0.877) |
| Weighted-F1 | 0.762 |
| Without 8 leaked rows (n=52) | accuracy 0.750, macro-F1 0.754 |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| low | 1.00 | 0.67 (CI 0.2-1.0) | 0.80 | 6 |
| medium | 0.60 | 0.90 | 0.72 | 20 |
| high | 0.92 | **0.68** | 0.78 | 34 |

Confusion (rows true, cols pred, low/medium/high; 1 abstention in `low`): `[4,1,0] [0,18,2] [0,11,23]`. Baselines: majority class acc 0.567 / macro-F1 0.241; existing rule predictor on this civic text 0.267 / 0.266 (not meaningful - it was written for railway text).

## 6. Known problems (read before relying on it)
1. **Domain mismatch:** nothing here measures performance on railway complaints.
2. **Under-triage:** 11 of 34 true `high` test items were predicted `medium` ("Street light pole dangerous", "Emergency delay in hospital" -> medium at 0.92 confidence). Confidence is not a safety signal.
3. In an unlabelled probe, "Brake failure suspected ... door open while moving" was labelled `medium` by the model; only the explicit rules produced `HIGH`. This is why the safety floor exists.
4. Tiny test set: wide intervals (`low` recall CI 0.2-1.0). No `critical` class. ~90% synthetic or synthetic_realistic data (~10% real). Training inputs are ~29-character glosses.
5. One test row had no known vocabulary; the service **abstains** (`NO_USABLE_TEXT`) rather than guessing, and the metrics count it as a miss.

## 7. Artifacts and versions
`artifacts/priority/priority-1.0.0.joblib` + `metadata.json` (labels, preprocessing, dataset hashes, split strategy, CV and test metrics, dependency versions, limitations, artifact SHA-256). The loader refuses an artifact whose hash differs. Retraining with the same inputs reproduces the identical artifact hash (verified). The artifact is **bundled into the image** (`COPY artifacts ./artifacts`); the dataset and training code are not.

## 8. API
`POST /internal/ai/predict-priority` (internal bearer token, same as other `/internal/ai/*`). Body: `{"text": "..."}` or `{"title": "...", "description": "..."}`.
```json
{ "status": "ML_MODEL", "modelVersion": "priority-1.0.0", "predictedUrgency": "medium",
  "recommendedPriority": "MEDIUM", "confidence": 0.62, "confidenceKind": "calibrated_sigmoid",
  "probabilities": {"high": 0.31, "low": 0.07, "medium": 0.62},
  "effectivePriority": "HIGH",
  "safetyRule": {"triggered": true, "priority": "HIGH", "matched": ["door open", "brake"], "source": "RuleBasedPriorityPredictor (explicit safety terms)"},
  "vocabularyCoverage": 0.2, "lowCoverage": true, "advisoryOnly": true, "warnings": ["..."] }
```
Errors: `401` bad/missing token; `422` empty/invalid body; `503` model unavailable (`{"detail": "Priority model is not available."}`).
`GET /health/models` (public, no secrets): `{"category": {"ready", "version"}, "priority": {"ready", "state", "version"}}`; `state` is one of `READY | DISABLED | ARTIFACT_MISSING | LOAD_FAILED`.

## 9. Commands (from `RailResolve/railresolve-fastapi-backend/`)
```
python -m training.prepare_priority_dataset --main civicdex_main.csv --adapted civicdex_adapted.csv
python -m training.train_priority_model          # writes artifacts/priority/, training/reports/priority_model_selection.json
python -m training.evaluate_priority_model       # one-shot test evaluation; writes priority_metrics.json/.md, updates metadata.json
python -m unittest tests.test_priority_model tests.test_model1_regression tests.test_category_model tests.test_ai_rules -v
docker build -t railresolve-fastapi ./RailResolve/railresolve-fastapi-backend
docker run --rm -p 8000:8000 --env-file RailResolve/railresolve-fastapi-backend/.env railresolve-fastapi
curl localhost:8000/health/models
```
Retraining Model 2 touches only `artifacts/priority/` and `training/reports/priority_*`; Model 1's directory and code are never read or written. Settings: `PRIORITY_MODEL_ENABLED` (default true), `PRIORITY_MODEL_DIR` (default `artifacts/priority`). In Kubernetes use `FASTAPI_URL=http://railresolve-fastapi:8000` (already set in the ConfigMap); there is no docker-compose file in this repository.

## 10. Next steps
Collect and label real railway complaints for urgency (include a CRITICAL tier); evaluate Model 2 on them before any promotion beyond advisory; confirm the CivicDex license; consider persisting `mlPriority` in Express (`complaintAiAnalysis` model + one line in `aiProcessing.service.js`) so shadow predictions can be compared with officer decisions; review whether words like "dangerous" and "emergency" should be explicit safety terms (separate change, shared with Express).
