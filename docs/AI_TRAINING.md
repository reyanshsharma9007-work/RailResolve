# AI Training

## Complaint category model (Model 1) — trained

TF-IDF (word 1-2 grams, `stop_words='english'`, `min_df=2`, sublinear tf) + `LinearSVC`, predicting one of the 7 existing department codes.

Reproduce, from `RailResolve/railresolve-fastapi-backend/`:

```
python -m training.train_category_model --data /path/to/indian_railway_complaint_tweets.csv
```

Steps performed by the script: keep `Label == complaint` (2,615 rows) -> shared cleaning (`app/ml/text_cleaning.py`, also used at serving time) -> map raw `Type` to departments (`training/category_label_map.py`; training fails on any unmapped Type) -> drop exact duplicates and conflicting-label duplicates (2,531 rows remain) -> stratified 80/10/10 split (seed 42) -> small grid search on the validation set only -> isotonic calibration of the SVM margin gap on validation -> one final test evaluation.

Outputs: `models/category/` (git-ignored: vectorizer, classifier, calibrator, `metadata.json` with SHA-256 of every artifact and of the dataset) and `training/reports/` (metrics JSON, cleaned-text error list).

The model is NOT refit on train+val, because validation data is used to calibrate confidence.

Note: the earlier guidance in this repo suggested a grouped 75/15/10 split; the 80/10/10 stratified split was used per the Model 1 specification. Tweets have no group/author column, so grouped splitting was not possible.

Deployment: the artifacts must be present at `CATEGORY_MODEL_DIR` (default `models/category`). The Dockerfile copies only `app/` and `.dockerignore` excludes `models/`, so mount or copy the folder in (volume, init container, or image build step). If absent or if a hash check fails, the service logs a warning and uses the rule-based classifier.

## Priority / urgency model (Model 2) - trained
See `AI_PRIORITY_MODEL.md` (CivicDex, grouped CV, advisory integration). Commands: `python -m training.prepare_priority_dataset`, `training.train_priority_model`, `training.evaluate_priority_model`.

## Other components

No datasets were supplied for the remaining components; they stay CPU-friendly deterministic implementations (priority rules, token-Jaccard duplicates, extractive summaries, grounded assistant, OCR + regex ticket scanner).
