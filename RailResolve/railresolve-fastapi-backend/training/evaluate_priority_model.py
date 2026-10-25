#!/usr/bin/env python3
"""One-shot held-out evaluation of the SAVED Model 2 artifact.

    python -m training.evaluate_priority_model

Loads the artifact through the production loader (SHA-256 verified) and predicts through
the production code path, so the evaluated model is the one that gets served. The test split
is evaluated here and nowhere else. Also writes the evaluation summary into metadata.json.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, brier_score_loss, classification_report, confusion_matrix,
                             f1_score, precision_recall_fscore_support)

from app.ml.priority_model import PriorityModel
from training import train_priority_model as tp
from training.priority_common import (DEFAULT_ARTIFACT_DIR, DEFAULT_PROCESSED_DIR, DEFAULT_REPORT_DIR,
                                      LABEL_ORDER, SEED)


def predict_rows(model: PriorityModel, texts):
    preds, probas = [], []
    for t in texts:
        r = model.predict("", t)
        preds.append(r["label"] if r else "__none__")
        probas.append([r["probabilities"][l] for l in model.labels] if r and r["probabilities"] else [np.nan] * len(model.labels))
    return np.array(preds), np.array(probas)


def metrics_block(y, pred, labels):
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=labels, zero_division=0)
    return {"n": int(len(y)), "accuracy": round(float(accuracy_score(y, pred)), 4),
            "macro_f1": round(float(f1_score(y, pred, average="macro", labels=labels, zero_division=0)), 4),
            "weighted_f1": round(float(f1_score(y, pred, average="weighted", labels=labels, zero_division=0)), 4),
            "per_class": {l: {"precision": round(float(a), 4), "recall": round(float(b), 4), "f1": round(float(c), 4), "support": int(d)}
                          for l, a, b, c, d in zip(labels, p, r, f, s)},
            "confusion_matrix": {"labels": labels, "rows_true_cols_pred": confusion_matrix(y, pred, labels=labels).tolist()},
            "classification_report": classification_report(y, pred, labels=labels, zero_division=0)}


def bootstrap_ci(y, pred, labels, n=2000):
    rng = np.random.default_rng(SEED)
    idx = np.arange(len(y)); acc, mf1, rec = [], [], {l: [] for l in labels}
    for _ in range(n):
        b = rng.choice(idx, len(idx))
        acc.append(accuracy_score(y[b], pred[b])); mf1.append(f1_score(y[b], pred[b], average="macro", labels=labels, zero_division=0))
        _, r, _, _ = precision_recall_fscore_support(y[b], pred[b], labels=labels, zero_division=0)
        for l, v in zip(labels, r): rec[l].append(v)
    ci = lambda a: [round(float(np.percentile(a, 2.5)), 3), round(float(np.percentile(a, 97.5)), 3)]
    return {"accuracy_95ci": ci(acc), "macro_f1_95ci": ci(mf1), "recall_95ci": {l: ci(v) for l, v in rec.items()}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    ap.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    ap.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    a = ap.parse_args()
    model = PriorityModel.load(a.artifact_dir)
    labels = [l for l in LABEL_ORDER if l in model.labels]
    df = pd.read_csv(a.processed_dir / "civicdex_priority_main.csv", keep_default_na=False)
    test = df[(df["split"] == "test") & df["use"]].reset_index(drop=True)
    y = test["label"].to_numpy()
    pred, proba = predict_rows(model, test["english_gloss"])
    abstained = pred == "__none__"   # no usable vocabulary -> the service abstains; counted as a MISS below

    out = {"artifact": model.metadata["artifact"], "model_version": model.version,
           "test_full": metrics_block(y, pred, labels), "abstentions_on_test": int(abstained.sum())}
    out["test_full"]["bootstrap"] = bootstrap_ci(y, pred, labels)
    keep = ~test["leaks_from_pool"].to_numpy()
    out["test_without_leaked_rows"] = metrics_block(y[keep], pred[keep], labels)
    out["test_without_leaked_rows"]["note"] = f"{int((~keep).sum())} test rows whose text also appears in train/val were removed"

    if model.probability_supported:   # probability quality on test (n=60: indicative only)
        cols = [model.labels.index(l) for l in labels]
        P, yy = proba[~abstained][:, cols], y[~abstained]
        e, table = tp.ece_top_label(P, yy, labels)
        tp.LABELS = labels
        out["test_probability_quality"] = {"n_scored": int(len(yy)), "ece_top_label": round(e, 4), "log_loss": round(tp.safe_log_loss(yy, P), 4),
                                           "brier_multiclass": round(float(np.mean(np.sum((P - np.eye(len(labels))[[labels.index(v) for v in yy]]) ** 2, axis=1))), 4),
                                           "reference_log_loss_uniform": round(float(np.log(len(labels))), 4),
                                           "note": "n=60, indicative only; see out-of-fold reliability in priority_model_selection.json"}
    maj = pd.read_csv(a.processed_dir / "civicdex_priority_main.csv", keep_default_na=False)
    majority = maj[maj["use"] & maj["split"].isin(["train", "val"])]["label"].value_counts().idxmax()
    out["baselines"] = {"majority_class": {"label": majority, **{k: v for k, v in metrics_block(y, np.array([majority] * len(y)), labels).items() if k in ("accuracy", "macro_f1")}}}
    try:  # existing rule-based priority predictor (written for railway text; shown for context only)
        from app.providers.rule_based import RuleBasedPriorityPredictor
        rp = RuleBasedPriorityPredictor()
        rule_pred = np.array([{"CRITICAL": "high"}.get(r["recommendedPriority"], r["recommendedPriority"].lower())
                              for r in (rp.predict("", t) for t in test["english_gloss"])])
        out["baselines"]["existing_rule_based_predictor"] = {k: v for k, v in metrics_block(y, rule_pred, labels).items() if k in ("accuracy", "macro_f1")}
    except Exception as err:  # pragma: no cover
        out["baselines"]["existing_rule_based_predictor"] = f"not computed ({type(err).__name__})"

    # ---- severity: analysed as a SEPARATE candidate target (no model shipped) ----
    pool = df[df["use"] & df["split"].isin(["train", "val"])].reset_index(drop=True)
    sev = pool.assign(label=pool["severity"])
    tp.LABELS = sorted(sev["label"].unique())
    cfg = {k: model.metadata["algorithm"][k] for k in ("C", "class_weight", "features")}
    cfg["model"] = model.metadata["algorithm"]["classifier"]
    sres = tp.cv_run(sev, cfg)
    out["severity_target_analysis"] = {
        "classes": sev["label"].value_counts().to_dict(),
        "cv_macro_f1_text_only": round(sres["macro_f1_mean"], 4),
        "urgency_given_severity": pd.crosstab(pool["severity"], pool["label"]).to_dict("index"),
        "verdict": "Not used as the priority target. The 4 values describe the KIND of issue (hazard / failure / delay / information query), "
                   "not a ranked scale, and they strongly imply urgency (see audit), so mixing them would leak the label.",
    }
    a.report_dir.mkdir(parents=True, exist_ok=True)
    (a.report_dir / "priority_metrics.json").write_text(json.dumps(out, indent=2, default=str))

    f = out["test_full"]; g = out["test_without_leaked_rows"]; b = f["bootstrap"]
    md = [f"# Model 2 evaluation - `{model.version}`\n",
          f"Artifact `{model.metadata['artifact']['file']}` sha256 `{model.metadata['artifact']['sha256'][:16]}...` (verified at load).\n",
          f"Official CivicDex **test** split, {f['n']} rows, evaluated once. Labels: {labels}. Abstentions (no usable vocabulary, counted as misses): {out['abstentions_on_test']}.\n",
          "| Metric | Full test (n=%d) | Without leaked rows (n=%d) |" % (f["n"], g["n"]), "|---|---|---|",
          f"| Accuracy | {f['accuracy']} (95% CI {b['accuracy_95ci']}) | {g['accuracy']} |",
          f"| Macro-F1 | {f['macro_f1']} (95% CI {b['macro_f1_95ci']}) | {g['macro_f1']} |",
          f"| Weighted-F1 | {f['weighted_f1']} | {g['weighted_f1']} |\n",
          "| Class | Precision | Recall (95% CI) | F1 | Support |", "|---|---|---|---|---|"]
    for l in labels:
        c = f["per_class"][l]; md.append(f"| {l} | {c['precision']} | {c['recall']} ({b['recall_95ci'][l]}) | {c['f1']} | {c['support']} |")
    md += ["", "Confusion matrix (rows = true, cols = predicted, order %s):" % labels, "```"]
    md += [str(r) for r in f["confusion_matrix"]["rows_true_cols_pred"]] + ["```", "", "```", f["classification_report"], "```", ""]
    md.append(f"Baselines (accuracy / macro-F1): {json.dumps({k: (v if isinstance(v, str) else [v['accuracy'], v['macro_f1']]) for k, v in out['baselines'].items()})}\n")
    if "test_probability_quality" in out: md.append(f"Probability quality on test: {out['test_probability_quality']}\n")
    md.append(f"Severity as a separate target (informational): {out['severity_target_analysis']['cv_macro_f1_text_only']} CV macro-F1; {out['severity_target_analysis']['verdict']}\n")
    md.append("**Limitations:** tiny test set (wide intervals, especially for `low`); civic-domain Chennai data, mostly synthetic; no CRITICAL class; "
              "inputs are short English glosses. These numbers do not predict performance on railway complaints and are not a safety validation.")
    (a.report_dir / "priority_evaluation.md").write_text("\n".join(md) + "\n")

    meta_path = a.artifact_dir / "metadata.json"; meta = json.loads(meta_path.read_text())
    meta["evaluation"] = {"split": "official CivicDex test (n=%d)" % f["n"], "accuracy": f["accuracy"], "macro_f1": f["macro_f1"],
                          "weighted_f1": f["weighted_f1"], "per_class_recall": {l: f["per_class"][l]["recall"] for l in labels},
                          "macro_f1_95ci": b["macro_f1_95ci"], "report": "training/reports/priority_evaluation.md"}
    meta_path.write_text(json.dumps(meta, indent=2))
    print("\n".join(md[:25]))


if __name__ == "__main__":
    sys.exit(main())
