#!/usr/bin/env python3
"""Train Model 2 (urgency) from the prepared CivicDex file.

    python -m training.prepare_priority_dataset --main ... --adapted ...
    python -m training.train_priority_model
    python -m training.evaluate_priority_model        # one-shot test evaluation

Selection uses repeated, stratified, GROUPED k-fold CV on the train+val pool only
(group = normalised text, so a repeated complaint never straddles folds). The official
test split is never read here. Writes artifacts/priority/ - Model 1's models/category is never touched.
"""
import argparse
import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from itertools import product
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import scipy
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, log_loss, precision_recall_fscore_support
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from app.ml.priority_text import normalize_priority_text
from training.priority_common import (DEFAULT_ARTIFACT_DIR, DEFAULT_PROCESSED_DIR, DEFAULT_REPORT_DIR,
                                      LABEL_ORDER, SEED, TARGET, TEXT_FIELD)

VERSION = "priority-1.0.0"
CV_SEEDS = (42, 43, 44)
CV_FOLDS = 5
TOKEN = r"(?u)\b\w+\b"   # keep single-character tokens such as "3" in "3 days"


def features(kind: str):
    word = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True, token_pattern=TOKEN)
    if kind == "word12":
        return word
    if kind == "word12+char":
        return FeatureUnion([("word", word),
                             ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True))])
    raise ValueError(kind)


def build(cfg: dict) -> Pipeline:
    if cfg["model"] == "logreg":
        clf = LogisticRegression(C=cfg["C"], class_weight=cfg["class_weight"], max_iter=5000, random_state=SEED)
    elif cfg["model"] == "linear_svm":
        clf = LinearSVC(C=cfg["C"], class_weight=cfg["class_weight"], max_iter=20000, random_state=SEED)
    else:
        raise ValueError(cfg["model"])
    if cfg.get("calibrate"):
        clf = CalibratedClassifierCV(clf, method="sigmoid", cv=5)
    return Pipeline([("tfidf", features(cfg["features"])), ("clf", clf)])


def safe_log_loss(y_true, proba):
    """sklearn's log_loss assumes columns in sorted-label order; ours follow LABELS (low, medium, high)."""
    order = [LABELS.index(c) for c in sorted(LABELS)]
    return float(log_loss(y_true, proba[:, order], labels=sorted(LABELS)))


def ece_top_label(proba, y_true, classes, bins=10):
    conf, pred = proba.max(1), np.array(classes)[proba.argmax(1)]
    correct = (pred == y_true).astype(float)
    edges, e, table = np.linspace(0, 1, bins + 1), 0.0, []
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            e += m.mean() * abs(correct[m].mean() - conf[m].mean())
            table.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": int(m.sum()),
                          "mean_confidence": round(float(conf[m].mean()), 3), "accuracy": round(float(correct[m].mean()), 3)})
    return float(e), table


def cv_run(df: pd.DataFrame, cfg: dict, extra: pd.DataFrame | None = None, text_col="text", want_proba=False):
    """Repeated stratified-group CV. `extra` rows (never evaluated) are added to every training fold,
    minus any whose group is in that fold's held-out groups."""
    scores, recalls, oof = [], [], []
    for seed in CV_SEEDS:
        skf = StratifiedGroupKFold(n_splits=CV_FOLDS, shuffle=True, random_state=seed)
        pred_all = pd.Series(index=df.index, dtype=object)
        proba_all = np.zeros((len(df), len(LABELS))) if want_proba else None
        for tr, te in skf.split(df[text_col], df["label"], df["group_id"]):
            tr_df, te_df = df.iloc[tr], df.iloc[te]
            if extra is not None:
                keep = ~extra["group_id"].isin(set(te_df["group_id"]))
                tr_df = pd.concat([tr_df, extra[keep]])
            p = build(cfg).fit(tr_df[text_col], tr_df["label"])
            pred_all.iloc[te] = p.predict(te_df[text_col])
            if want_proba:
                proba_all[te] = p.predict_proba(te_df[text_col])[:, [list(p.classes_).index(c) for c in LABELS]]
        scores.append(f1_score(df["label"], pred_all, average="macro"))
        _, r, _, _ = precision_recall_fscore_support(df["label"], pred_all, labels=LABELS, zero_division=0)
        recalls.append(r)
        oof.append(proba_all)
    out = {"macro_f1_mean": float(np.mean(scores)), "macro_f1_std": float(np.std(scores)),
           "recall_per_class_mean": {l: float(v) for l, v in zip(LABELS, np.mean(recalls, 0))}}
    if want_proba:
        out["oof_proba"] = np.mean(oof, 0)
    return out


def main():
    global LABELS
    ap = argparse.ArgumentParser()
    ap.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    ap.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    ap.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    ap.add_argument("--audit", type=Path, default=DEFAULT_REPORT_DIR / "priority_dataset_audit.json")
    args = ap.parse_args()
    args.artifact_dir.mkdir(parents=True, exist_ok=True)
    args.report_dir.mkdir(parents=True, exist_ok=True)

    main_df = pd.read_csv(args.processed_dir / "civicdex_priority_main.csv", keep_default_na=False)
    adapted_df = pd.read_csv(args.processed_dir / "civicdex_priority_adapted.csv", keep_default_na=False)
    pool = main_df[main_df["use"] & main_df["split"].isin(["train", "val"])].reset_index(drop=True)   # TEST NOT LOADED INTO ANY STEP
    LABELS = [l for l in LABEL_ORDER if l in set(pool["label"])]
    print(f"pool rows={len(pool)} labels={LABELS} dist={pool['label'].value_counts().to_dict()}")

    # ---- 1. model comparison grid (CV on pool) ----
    grid = []
    for model, feats, cw, C in product(["logreg", "linear_svm"], ["word12", "word12+char"], [None, "balanced"],
                                       {"logreg": [0.3, 1, 3, 10], "linear_svm": [0.1, 0.3, 1, 3]}["logreg"]):
        if model == "linear_svm":
            C = {0.3: 0.1, 1: 0.3, 3: 1, 10: 3}[C]
        cfg = {"model": model, "features": feats, "class_weight": cw, "C": C}
        r = cv_run(pool, cfg)
        grid.append({**cfg, **r})
        print(f"  {model:10} {feats:12} cw={str(cw):8} C={C:<4} macroF1={r['macro_f1_mean']:.3f}±{r['macro_f1_std']:.3f}")
    gdf = pd.DataFrame(grid).sort_values("macro_f1_mean", ascending=False)
    best_lr = gdf[gdf.model == "logreg"].iloc[0].to_dict()
    best_svm = gdf[gdf.model == "linear_svm"].iloc[0].to_dict()
    # Rule: take the higher CV macro-F1, but prefer logistic regression (native probabilities)
    # unless the SVM wins by more than 0.01 macro-F1.
    chosen = best_svm if best_svm["macro_f1_mean"] - best_lr["macro_f1_mean"] > 0.01 else best_lr
    cfg = {k: chosen[k] for k in ("model", "features", "class_weight", "C")}
    cfg["class_weight"] = None if pd.isna(cfg["class_weight"]) else cfg["class_weight"]
    print("best LR :", round(best_lr["macro_f1_mean"], 4), "| best SVM:", round(best_svm["macro_f1_mean"], 4), "| chosen:", cfg)

    # ---- 2. input-field study (same config; only the text source changes) ----
    field_study = {}
    for name, series in {"english_gloss": pool["text"],
                         "normalized_text": pool["normalized_text"].map(normalize_priority_text),
                         "raw_text": pool["raw_text"].map(normalize_priority_text)}.items():
        tmp = pool.assign(text_variant=series)
        field_study[name] = {k: v for k, v in cv_run(tmp, cfg, text_col="text_variant").items()}
    print("text field study:", {k: round(v["macro_f1_mean"], 3) for k, v in field_study.items()})

    # ---- 3. ablation: add the 60 unverified `adapted` rows to training folds only ----
    extra_ids = set(adapted_df["request_id"]) - set(main_df["request_id"])
    extra = adapted_df[adapted_df["request_id"].isin(extra_ids) & adapted_df["use"]]
    ablation = {"main_only": cv_run(pool, cfg), "main_plus_60_adapted_rows_in_training": cv_run(pool, cfg, extra=extra)}
    print("adapted ablation:", {k: round(v["macro_f1_mean"], 3) for k, v in ablation.items()})

    # ---- 4. probability reliability (out-of-fold) ----
    calibration = None
    if cfg["model"] == "logreg":
        plain = cv_run(pool, cfg, want_proba=True)
        calc = cv_run(pool, {**cfg, "calibrate": True}, want_proba=True)
        calibration = {}
        for name, r in (("plain_logreg", plain), ("logreg_sigmoid_calibrated", calc)):
            e, table = ece_top_label(r["oof_proba"], pool["label"].to_numpy(), LABELS)
            calibration[name] = {"macro_f1_mean": round(r["macro_f1_mean"], 4), "ece_top_label": round(e, 4),
                                 "log_loss": round(safe_log_loss(pool["label"], r["oof_proba"]), 4), "reliability_bins": table}
        use_cal = (calibration["logreg_sigmoid_calibrated"]["log_loss"] < calibration["plain_logreg"]["log_loss"] - 0.01
                   and calibration["logreg_sigmoid_calibrated"]["ece_top_label"] <= calibration["plain_logreg"]["ece_top_label"])
        cfg["calibrate"] = bool(use_cal)
        print("calibration:", {k: (v["ece_top_label"], v["log_loss"]) for k, v in calibration.items()}, "-> calibrate:", use_cal)
    prob_kind = ("calibrated_sigmoid" if cfg.get("calibrate") else "logreg_native") if cfg["model"] == "logreg" else None

    # ---- 5. final fit on the full pool & save ----
    final = build(cfg).fit(pool["text"], pool["label"])
    art_name = f"{VERSION}.joblib"
    joblib.dump(final, args.artifact_dir / art_name)
    sha = hashlib.sha256((args.artifact_dir / art_name).read_bytes()).hexdigest()
    audit = json.loads(args.audit.read_text()) if args.audit.exists() else {}
    metadata = {
        "model_name": "railresolve-priority", "model_version": VERSION,
        "target_column": TARGET, "input_text_field": TEXT_FIELD, "labels": list(final.classes_),
        "label_note": "Labels are exactly those present in CivicDex (low/medium/high). The model never predicts CRITICAL.",
        "algorithm": {"classifier": cfg["model"], "features": cfg["features"], "class_weight": cfg["class_weight"],
                      "C": cfg["C"], "calibrated": bool(cfg.get("calibrate"))},
        "probability_supported": prob_kind is not None,
        "probability_kind": prob_kind,
        "preprocessing": {"function": "app.ml.priority_text.normalize_priority_text",
                          "steps": "lowercase; strip URLs/e-mails/@mentions/HTML entities/punctuation; keep digits and unicode letters; collapse whitespace; title+description joined by a space",
                          "tfidf_token_pattern": TOKEN, "stop_words_removed": False},
        "artifact": {"file": art_name, "sha256": sha},
        "dataset": {"name": "CivicDex (JadeSamLee/civicdex)", "variant_used": "civicdex_main.csv (official 600 rows)",
                    "files": audit.get("files"), "license": "NOT VERIFIED (no network access when trained) - confirm before commercial use",
                    "cleaning": audit.get("cleaning", {}).get("main")},
        "split_strategy": {"official_split_column": "train/val/test respected; test never used for selection or fitting",
                           "selection": f"{CV_FOLDS}-fold StratifiedGroupKFold x seeds {list(CV_SEEDS)} on train+val, group = normalised text",
                           "final_fit": "all kept train+val rows", "random_seed": SEED,
                           "pool_rows": int(len(pool)), "pool_label_distribution": pool["label"].value_counts().to_dict()},
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "cv_selection": {"best_logreg": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in best_lr.items() if k != "recall_per_class_mean"},
                         "best_linear_svm": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in best_svm.items() if k != "recall_per_class_mean"},
                         "chosen": cfg, "rule": "higher CV macro-F1; prefer logistic regression (native probabilities) unless the SVM wins by >0.01"},
        "env": {"python": platform.python_version(), "scikit_learn": sklearn.__version__, "numpy": np.__version__,
                "scipy": scipy.__version__, "joblib": joblib.__version__},
        "evaluation": "see training/reports/priority_metrics.json (written by training.evaluate_priority_model)",
        "limitations": [
            "Trained on Chennai civic-service requests (English glosses), NOT railway complaints.",
            "~90% of rows are synthetic or synthetic_realistic (only ~10% real); only three urgency classes, no CRITICAL.",
            "Very small data (a few hundred rows; ~70 'low' examples): metrics are high-variance.",
            "Training inputs are ~29-character glosses; production inputs are longer title+description text.",
            "Offline metrics do not establish safety. Explicit railway safety rules must keep overriding this model.",
        ],
    }
    (args.artifact_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))
    sel = {"grid_cv_on_train_val": [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()} for r in gdf.to_dict("records")],
           "chosen_config": cfg, "text_field_study_cv_macro_f1": {k: round(v["macro_f1_mean"], 4) for k, v in field_study.items()},
           "text_field_study_recalls": {k: v["recall_per_class_mean"] for k, v in field_study.items()},
           "adapted_rows_ablation_cv": {k: {kk: (round(vv, 4) if isinstance(vv, float) else vv) for kk, vv in v.items()} for k, v in ablation.items()},
           "probability_reliability_oof": calibration}
    (args.report_dir / "priority_model_selection.json").write_text(json.dumps(sel, indent=2, default=str))
    print("saved", args.artifact_dir / art_name, sha[:16])


if __name__ == "__main__":
    sys.exit(main())
