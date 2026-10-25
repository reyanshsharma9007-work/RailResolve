# training/priority_common.py - constants shared by the Model 2 training scripts.
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_PROCESSED_DIR = REPO_ROOT / "datasets" / "processed"   # git-ignored
DEFAULT_ARTIFACT_DIR = BACKEND_ROOT / "artifacts" / "priority"  # Model 1 lives in models/category - never touched
DEFAULT_REPORT_DIR = BACKEND_ROOT / "training" / "reports"

SEED = 42
TARGET = "urgency"
TEXT_FIELD = "english_gloss"
REQUIRED_COLUMNS = ["request_id", "raw_text", "normalized_text", "english_gloss", "language_type",
                    "intent", "category", "department", "urgency", "severity", "locality",
                    "district", "source_type", "split"]
# Ordinal order (low < medium < high); only labels actually present are used.
LABEL_ORDER = ["low", "medium", "high"]
