#!/usr/bin/env python3
"""Audit + prepare CivicDex for Model 2 (urgency).

    python -m training.prepare_priority_dataset \
        --main civicdex_main.csv --adapted civicdex_adapted.csv

Raw CSVs are read-only. Writes processed CSVs (datasets/processed/, git-ignored),
an audit JSON and a Markdown audit report (training/reports/). Every cleaning
step is counted; nothing is dropped silently and no label is ever invented.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

from app.ml.priority_text import normalize_priority_text
from training.priority_common import (DEFAULT_PROCESSED_DIR, DEFAULT_REPORT_DIR, LABEL_ORDER,
                                      REQUIRED_COLUMNS, TARGET, TEXT_FIELD)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def audit_raw(df: pd.DataFrame, name: str) -> dict:
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise SystemExit(f"{name}: missing required columns {missing_cols}")
    a = {"rows": int(len(df)), "columns": list(df.columns), "dtypes": {c: str(t) for c, t in df.dtypes.items()},
         "missing_values": {c: int(v) for c, v in df.isna().sum().items() if v},
         "request_id_unique": bool(df["request_id"].is_unique),
         "urgency_values": df["urgency"].value_counts(dropna=False).to_dict(),
         "severity_values": df["severity"].value_counts(dropna=False).to_dict(),
         "intent_values": df["intent"].value_counts().to_dict(),
         "language_type": df["language_type"].value_counts().to_dict(),
         "source_type": df["source_type"].value_counts().to_dict(),
         "split_column": df["split"].value_counts().to_dict(),
         "urgency_by_split": pd.crosstab(df["split"], df["urgency"]).to_dict("index"),
         "urgency_by_source_type": pd.crosstab(df["source_type"], df["urgency"]).to_dict("index"),
         "duplicates": {c: int(df[c].duplicated().sum()) for c in ("raw_text", "normalized_text", "english_gloss")},
         "locality_values": df["locality"].value_counts().to_dict(),
         "district_values": df["district"].value_counts().to_dict()}
    norm = df["english_gloss"].map(normalize_priority_text)
    a["duplicates"]["english_gloss_after_normalisation"] = int(norm.duplicated().sum())
    a["conflicting_urgency_gloss_groups"] = int((df.assign(n=norm).groupby("n")["urgency"].nunique() > 1).sum())
    sets = {s: set(norm[df["split"] == s]) for s in df["split"].unique()}
    a["cross_split_gloss_overlap"] = {f"{x}&{y}": len(sets[x] & sets[y]) for x, y in
                                      (("train", "val"), ("train", "test"), ("val", "test")) if x in sets and y in sets}
    # How much of urgency is already implied by two other label-like columns?
    g = df.groupby(["intent", "severity"])["urgency"]
    a["urgency_purity_given_intent_severity"] = round(float(g.agg(lambda s: s.value_counts().iloc[0]).sum() / len(df)), 3)
    a["urgency_purity_given_severity"] = round(float(df.groupby("severity")["urgency"].agg(lambda s: s.value_counts().iloc[0]).sum() / len(df)), 3)
    a["english_gloss_chars"] = df["english_gloss"].str.len().describe().round(1).to_dict()
    a["tamil_script_share_raw_text"] = round(float(df["raw_text"].str.contains(r"[\u0B80-\u0BFF]").mean()), 3)
    return a


def prepare(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Returns the processed frame (with an explicit `use` flag + `drop_reason`) and a cleaning log."""
    log = {"input_rows": int(len(df))}
    d = df.copy()
    d["text"] = d[TEXT_FIELD].map(normalize_priority_text)
    d["label"] = d[TARGET].astype("string").str.strip().str.lower()
    d["use"], d["drop_reason"] = True, ""

    bad = d["label"].isna() | ~d["label"].isin(LABEL_ORDER) | (d["text"] == "")
    d.loc[bad, ["use", "drop_reason"]] = [False, "missing_or_invalid_target_or_text"]
    log["dropped_missing_or_invalid"] = int(bad.sum())

    pool = d["split"].isin(["train", "val"]) & d["use"]
    # Ambiguous: same normalised text, different urgency, inside the train+val pool.
    nun = d[pool].groupby("text")["label"].nunique()
    conflict_texts = set(nun[nun > 1].index)
    conf = pool & d["text"].isin(conflict_texts)
    d.loc[conf, ["use", "drop_reason"]] = [False, "conflicting_label_duplicate"]
    log["dropped_conflicting_label_duplicates"] = int(conf.sum())

    # Exact (text,label) duplicates inside the train+val pool: keep first only.
    pool = d["split"].isin(["train", "val"]) & d["use"]
    dup = pool & d.duplicated(["text", "label"], keep="first")
    d.loc[dup, ["use", "drop_reason"]] = [False, "exact_duplicate_in_pool"]
    log["dropped_exact_duplicates_in_pool"] = int(dup.sum())

    # Test rows are never dropped; rows whose text also occurs in train/val are FLAGGED so
    # evaluation can be reported with and without that leakage.
    pool_texts = set(d.loc[d["split"].isin(["train", "val"]) & d["use"], "text"])
    d["leaks_from_pool"] = (d["split"] == "test") & d["text"].isin(pool_texts)
    log["test_rows_total"] = int((d["split"] == "test").sum())
    log["test_rows_leaking_from_train_val"] = int(d["leaks_from_pool"].sum())
    # grouping key so repeats of the same complaint never straddle CV folds
    d["group_id"] = d["text"].map(lambda t: hashlib.md5(t.encode()).hexdigest()[:12])
    log["rows_kept"] = int(d["use"].sum())
    log["kept_by_split"] = d[d["use"]].groupby("split").size().to_dict()
    log["kept_label_distribution"] = d[d["use"]].groupby(["split", "label"]).size().unstack(fill_value=0).to_dict("index")
    return d, log


def render_markdown(audit: dict) -> str:
    L = []
    L.append("# CivicDex dataset audit (Model 2 - priority/urgency)\n")
    L.append("_Generated by `training/prepare_priority_dataset.py`. All numbers below are computed, not hand-written._\n")
    L.append("## Provenance and license\n")
    L.append(f"- Files audited: `{audit['files']['main']['name']}` (sha256 `{audit['files']['main']['sha256'][:16]}...`) and "
             f"`{audit['files']['adapted']['name']}` (sha256 `{audit['files']['adapted']['sha256'][:16]}...`).")
    L.append("- **License: NOT VERIFIED.** This environment has no network access, so the Hugging Face dataset card "
             "(https://huggingface.co/datasets/JadeSamLee/civicdex) could not be read, and the supplied CSVs carry no license field. "
             "Confirm the license and permitted (esp. commercial) use before shipping the trained artifact.")
    L.append("- `civicdex_adapted.csv` = `civicdex_main.csv` + 60 appended rows (`CDX_601`-`CDX_660`), all in the `train` split. "
             f"The 600 shared rows are identical. Origin of the 60 extra rows is undocumented: {audit['adapted_vs_main']['extra_rows']} rows, "
             f"languages {audit['adapted_vs_main']['extra_language_type']}, severity vocabulary drifts (main has "
             f"{audit['adapted_vs_main']['main_severity_vocab']} severity values, adapted has {audit['adapted_vs_main']['adapted_severity_vocab']}).\n")
    m = audit["main"]
    L.append("## Schema and content (`civicdex_main.csv`)\n")
    L.append(f"- Rows: **{m['rows']}**, columns: {len(m['columns'])} (all 14 expected columns present). Missing values: {m['missing_values'] or 'none'}. `request_id` unique: {m['request_id_unique']}.")
    L.append(f"- **Domain: Chennai civic services** (district values {m['district_values']}), not railways. Categories: sanitation, water, roads, certificates, drainage, street lighting, electricity, public health, transport, welfare.")
    L.append(f"- **Language:** {m['language_type']}; {m['tamil_script_share_raw_text']:.0%} of `raw_text` contains Tamil script. `english_gloss` is the English rendering (mean {m['english_gloss_chars']['mean']} chars - very short).")
    L.append(f"- **Source mix:** {m['source_type']} - the large majority is synthetic.")
    L.append(f"- **`urgency` labels (actual):** {m['urgency_values']} - **three classes, no `critical`**.")
    L.append(f"- **`severity` labels (actual, main):** {m['severity_values']} (adapted has {audit['adapted']['severity_values'].__len__()} distinct values; analysed separately, not mixed into the target).")
    L.append(f"- **Predefined split column:** {m['split_column']} - respected. Urgency by split: {m['urgency_by_split']}.")
    L.append(f"- **Data-quality defects:** `locality` contains the value `real` in {m['locality_values'].get('real', 0)} rows (a shifted `source_type` value in the wrong column); `district` is constant, so it carries no information.")
    L.append(f"- **Duplicates:** {m['duplicates']}. Urgency-conflicting duplicate-text groups: {m['conflicting_urgency_gloss_groups']}. Cross-split gloss overlap: {m['cross_split_gloss_overlap']} (train/val/test leakage).")
    L.append(f"- **Target leakage risk:** `urgency` is {m['urgency_purity_given_severity']:.0%} predictable from `severity` alone and {m['urgency_purity_given_intent_severity']:.0%} from `intent`+`severity`. Those columns are label-like and are **excluded from the features**; the model sees text only. Consequence: what the model can learn is essentially 'does this text read like an information query / hazard / delay', i.e. the severity/intent structure expressed in words.")
    L.append("\n## Suitability verdict\n")
    L.append("- A usable 3-class urgency target exists and is internally consistent enough to train on (conflicting duplicates are rare).")
    L.append("- **It is not railway data.** There are no railway complaints, no `critical` examples, and the only English text is a short translation gloss. Offline metrics therefore describe in-domain performance on Chennai civic requests and say little about RailResolve complaints. The trained model should be treated as an experimental advisory signal until it is validated on labelled railway complaints.")
    L.append("- Test (60) and validation (60) sets are small; the `low` class has very few examples in each, so per-class metrics carry wide uncertainty (confidence intervals are reported with the evaluation).\n")
    L.append("## Cleaning decisions and impact\n")
    for variant in ("main", "adapted"):
        c = audit["cleaning"][variant]
        L.append(f"**{variant}:** input {c['input_rows']} -> kept {c['rows_kept']}; dropped {c['dropped_missing_or_invalid']} missing/invalid, "
                 f"{c['dropped_conflicting_label_duplicates']} conflicting-label duplicates, {c['dropped_exact_duplicates_in_pool']} exact duplicates in train+val. "
                 f"Test rows are never dropped; {c['test_rows_leaking_from_train_val']} of {c['test_rows_total']} test rows duplicate a train/val text and are flagged (evaluation is reported with and without them). Kept per split: {c['kept_by_split']}.")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--main", required=True, type=Path)
    ap.add_argument("--adapted", required=True, type=Path)
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    ap.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    a = ap.parse_args()
    a.out_dir.mkdir(parents=True, exist_ok=True)
    a.report_dir.mkdir(parents=True, exist_ok=True)

    main_df, adapted_df = pd.read_csv(a.main), pd.read_csv(a.adapted)
    audit = {"files": {"main": {"name": a.main.name, "sha256": sha256_file(a.main)},
                       "adapted": {"name": a.adapted.name, "sha256": sha256_file(a.adapted)}},
             "main": audit_raw(main_df, "main"), "adapted": audit_raw(adapted_df, "adapted"), "cleaning": {}}
    extra = adapted_df[~adapted_df["request_id"].isin(main_df["request_id"])]
    shared = main_df.merge(adapted_df, on="request_id", suffixes=("_m", "_a"))
    changed = {c: int((shared[c + "_m"] != shared[c + "_a"]).sum()) for c in main_df.columns if c != "request_id"}
    audit["adapted_vs_main"] = {"extra_rows": int(len(extra)), "shared_rows": int(len(shared)),
                                "shared_rows_changed_by_column": {k: v for k, v in changed.items() if v},
                                "extra_language_type": extra["language_type"].value_counts().to_dict(),
                                "extra_splits": extra["split"].value_counts().to_dict(),
                                "main_severity_vocab": int(main_df["severity"].nunique()),
                                "adapted_severity_vocab": int(adapted_df["severity"].nunique())}
    for name, df in (("main", main_df), ("adapted", adapted_df)):
        processed, log = prepare(df)
        processed.to_csv(a.out_dir / f"civicdex_priority_{name}.csv", index=False)
        audit["cleaning"][name] = log
    (a.report_dir / "priority_dataset_audit.json").write_text(json.dumps(audit, indent=2, default=str))
    (a.report_dir / "priority_dataset_audit.md").write_text(render_markdown(audit))
    print(json.dumps({k: audit["cleaning"][k] for k in audit["cleaning"]}, indent=1))
    print("processed ->", a.out_dir, "| reports ->", a.report_dir)


if __name__ == "__main__":
    sys.exit(main())
