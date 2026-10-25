#!/usr/bin/env python3
"""Train RailResolve Model 1: complaint -> department (TF-IDF + LinearSVC).

Usage (from railresolve-fastapi-backend/):
    python -m training.train_category_model --data /path/to/indian_railway_complaint_tweets.csv

Writes to models/category/ (git-ignored) and training/reports/ (committable).
The held-out TEST split is touched exactly once, after all choices are frozen.
"""
import argparse
import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             f1_score, precision_recall_fscore_support)
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC

from app.ml.text_cleaning import clean_text
from training.category_label_map import map_row

ROOT = Path(__file__).resolve().parents[1]
SEED = 42
VERSION = "category-svm-1.0.0"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_and_prepare(csv_path: Path):
    raw = pd.read_csv(csv_path)
    log = {"raw_rows": int(len(raw))}
    df = raw[raw["Label"] == "complaint"].drop(columns=["Label"]).copy()
    log["complaint_rows"] = int(len(df))
    log["distinct_raw_types_in_complaints"] = int(df["Type"].nunique())
    df["y"] = [map_row(t, x) for t, x in zip(df["Type"], df["Tweet"])]
    df["text"] = df["Tweet"].map(clean_text)
    df = df[df["text"].str.len() > 0]
    # Exact duplicates after cleaning leak across splits. Drop conflicting-label
    # groups entirely (ambiguous), keep one copy of agreeing groups.
    labels_per_text = df.groupby("text")["y"].nunique()
    conflicting = set(labels_per_text[labels_per_text > 1].index)
    log["dropped_conflicting_duplicate_texts"] = int(df["text"].isin(conflicting).sum())
    df = df[~df["text"].isin(conflicting)]
    before = len(df)
    df = df.drop_duplicates("text")
    log["dropped_exact_duplicates"] = int(before - len(df))
    log["final_rows"] = int(len(df))
    return df.reset_index(drop=True), log


def split_80_10_10(df):
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(
        df["text"], df["y"], test_size=0.20, stratify=df["y"], random_state=SEED)
    X_va, X_te, y_va, y_te = train_test_split(
        X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=SEED)
    return X_tr, X_va, X_te, y_tr, y_va, y_te


def top_gap(scores: np.ndarray) -> np.ndarray:
    part = np.sort(scores, axis=1)
    return part[:, -1] - part[:, -2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--out", type=Path, default=ROOT / "models" / "category")
    ap.add_argument("--reports", type=Path, default=ROOT / "training" / "reports")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    args.reports.mkdir(parents=True, exist_ok=True)

    df, prep_log = load_and_prepare(args.data)
    X_tr, X_va, X_te, y_tr, y_va, y_te = split_80_10_10(df)
    classes = sorted(df["y"].unique())
    for name, ys in (("train", y_tr), ("val", y_va), ("test", y_te)):
        missing = set(classes) - set(ys)
        assert not missing, f"{name} split is missing classes: {missing}"
    split_sizes = {"train": len(X_tr), "val": len(X_va), "test": len(X_te)}
    print("prep:", prep_log, "\nsplits:", split_sizes)
    print(df["y"].value_counts().to_string())

    # ---- model selection on VALIDATION only (vectorizer always fit on train) ----
    grid, best = [], None
    for ngram in [(1, 1), (1, 2)]:
        vec = TfidfVectorizer(stop_words="english", min_df=2, ngram_range=ngram,
                              sublinear_tf=True, max_features=30000)
        Xtr = vec.fit_transform(X_tr)
        Xva = vec.transform(X_va)
        for cw in [None, "balanced"]:
            for C in [0.1, 0.3, 1.0, 3.0]:
                clf = LinearSVC(C=C, class_weight=cw, max_iter=20000, random_state=SEED)
                clf.fit(Xtr, y_tr)
                pred = clf.predict(Xva)
                row = {"ngram": list(ngram), "class_weight": cw, "C": C,
                       "val_macro_f1": round(f1_score(y_va, pred, average="macro"), 4),
                       "val_accuracy": round(accuracy_score(y_va, pred), 4)}
                grid.append(row)
                if best is None or row["val_macro_f1"] > best[0]["val_macro_f1"]:
                    best = (row, vec, clf)
    cfg, vectorizer, clf = best
    print("best config:", cfg)

    # ---- confidence calibration: margin gap -> P(correct), fit on VALIDATION ----
    Xva = vectorizer.transform(X_va)
    va_scores = clf.decision_function(Xva)
    va_correct = (clf.classes_[va_scores.argmax(1)] == y_va.to_numpy()).astype(float)
    calibrator = IsotonicRegression(y_min=0.0, y_max=1.0, increasing=True, out_of_bounds="clip")
    calibrator.fit(top_gap(va_scores), va_correct)

    # ---- single, final TEST evaluation ----
    Xte = vectorizer.transform(X_te)
    te_scores = clf.decision_function(Xte)
    te_pred = clf.classes_[te_scores.argmax(1)]
    te_conf = calibrator.predict(top_gap(te_scores))
    report = classification_report(y_te, te_pred, labels=list(clf.classes_), output_dict=True, zero_division=0)
    macro_f1 = float(f1_score(y_te, te_pred, average="macro"))
    majority = y_tr.value_counts().idxmax()
    baseline_macro = float(f1_score(y_te, [majority] * len(y_te), average="macro", labels=list(clf.classes_)))
    cm = confusion_matrix(y_te, te_pred, labels=list(clf.classes_))
    coverage = {}
    for thr in (0.3, 0.4, 0.5, 0.6, 0.7):
        m = te_conf >= thr
        coverage[str(thr)] = {"coverage": round(float(m.mean()), 3),
                              "accuracy_on_accepted": round(float((te_pred[m] == y_te.to_numpy()[m]).mean()), 3) if m.any() else None}

    metrics = {
        "model_version": VERSION,
        "test": {"macro_f1": round(macro_f1, 4), "accuracy": round(float(accuracy_score(y_te, te_pred)), 4),
                 "majority_class_baseline_macro_f1": round(baseline_macro, 4),
                 "per_class": {k: {m: round(v[m], 4) if m != "support" else int(v[m]) for m in ("precision", "recall", "f1-score", "support")}
                               for k, v in report.items() if k in clf.classes_}},
        "confusion_matrix": {"labels": list(clf.classes_), "rows_true_cols_pred": cm.tolist()},
        "confidence_threshold_tradeoff_on_test": coverage,
        "selected_config": cfg, "grid_search_on_validation": grid,
    }
    (args.reports / "category_metrics.json").write_text(json.dumps(metrics, indent=2))

    # error inspection (cleaned text only; no raw tweets / handles / PNRs)
    err = pd.DataFrame({"true": y_te.to_numpy(), "pred": te_pred, "confidence": te_conf.round(2), "cleaned_text": X_te.to_numpy()})
    err = err[err["true"] != err["pred"]]
    err["cleaned_text"] = err["cleaned_text"].str.slice(0, 200)
    err.sort_values("confidence", ascending=False).to_csv(args.reports / "category_test_errors.csv", index=False)

    # ---- persist artifacts (+ integrity hashes) ----
    paths = {"vectorizer": "tfidf_vectorizer.joblib", "classifier": "category_clf.joblib",
             "calibrator": "margin_calibrator.joblib"}
    joblib.dump(vectorizer, args.out / paths["vectorizer"])
    joblib.dump(clf, args.out / paths["classifier"])
    joblib.dump(calibrator, args.out / paths["calibrator"])
    metadata = {
        "model_version": VERSION, "trained_at": datetime.now(timezone.utc).isoformat(),
        "classes": list(clf.classes_), "artifacts": paths,
        "artifact_sha256": {k: sha256_file(args.out / v) for k, v in paths.items()},
        "dataset": {"file": args.data.name, "sha256": sha256_file(args.data), **prep_log},
        "splits": split_sizes, "split_ratio": "80/10/10 stratified", "random_state": SEED,
        "selected_config": cfg,
        "recommended_min_confidence": 0.5,
        "env": {"python": platform.python_version(), "scikit_learn": sklearn.__version__, "numpy": np.__version__},
        "caveats": [
            "Labels derive from a noisy raw 'Type' column mapped by hand (training/category_label_map.py).",
            "STATION_MAINTENANCE labels are rule-derived (weak supervision) and have very few examples.",
            "Trained on tweets; production inputs are form submissions (title + description).",
        ],
    }
    (args.out / "metadata.json").write_text(json.dumps(metadata, indent=2))

    print(f"\nTEST macro-F1 {macro_f1:.4f}  accuracy {metrics['test']['accuracy']}  (majority baseline macro-F1 {baseline_macro:.4f})")
    print(classification_report(y_te, te_pred, labels=list(clf.classes_), zero_division=0))
    print("coverage/accuracy by confidence threshold:", json.dumps(coverage))
    print("artifacts ->", args.out)


if __name__ == "__main__":
    sys.exit(main())
