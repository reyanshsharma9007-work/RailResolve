"""Model 1 (Category SVM) regression protection.

Compares live behaviour with a snapshot recorded BEFORE Model 2 was added
(tests/fixtures/model1_baseline.json) and verifies Model 1's artifacts are byte-identical
(tests/fixtures/model1_artifact_checksums.json). Covers the raw model, the hybrid classifier
(incl. the explicit cleanliness override) and the classification/priority/duplicate/summary
parts of the /analyze flow. The only permitted difference in /analyze is the NEW optional
`mlPriority` key.
"""
import os
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-token")

import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIX = Path(__file__).parent / "fixtures"
M1_DIR = ROOT / "models" / "category"
HAVE_M1 = (M1_DIR / "metadata.json").exists()


def rt(x):  # normalise through JSON like the snapshot was
    return json.loads(json.dumps(x, sort_keys=True, default=str))


@unittest.skipUnless(HAVE_M1, "Model 1 artifacts not present")
class Model1RegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.ml.category_model import load_category_model
        from app.providers.ml_category import HybridCategoryClassifier
        from app.services.rail_ai import analyze
        cls.base = json.loads((FIX / "model1_baseline.json").read_text())
        cls.model = load_category_model()
        cls.hybrid = HybridCategoryClassifier()
        cls.analyze = staticmethod(analyze)

    def test_artifacts_are_byte_identical(self):
        expected = json.loads((FIX / "model1_artifact_checksums.json").read_text())
        for name, sha in expected.items():
            self.assertEqual(hashlib.sha256((M1_DIR / name).read_bytes()).hexdigest(), sha, name)
        self.assertEqual(sorted(p.name for p in M1_DIR.iterdir()), sorted(expected))

    def test_model_version_and_threshold(self):
        self.assertEqual(self.base["model_version"], self.model.version)
        self.assertEqual(self.model.default_min_confidence, 0.5)

    def test_raw_model_predictions_unchanged(self):
        for c in self.base["cases"]:
            got = self.model.predict(f"{c['title']} {c['description']}")
            self.assertEqual(rt(got), c["raw_model"], c["description"])

    def test_hybrid_classification_unchanged(self):
        for c in self.base["cases"]:
            got = self.hybrid.classify(c["title"], c["description"], None, None)
            self.assertEqual(rt(got), c["hybrid"], c["description"])

    def test_cleanliness_override_still_applies(self):
        # Raw SVM disagrees (TRAIN_MAINTENANCE / GENERAL_SUPPORT) but the explicit override routes it.
        for title, desc in (("Dirty toilet", "The toilet in coach S5 is dirty and smells"),
                            ("Cleanliness", "Platform and waiting hall hygiene is very poor")):
            raw = self.model.predict(f"{title} {desc}")
            hyb = self.hybrid.classify(title, desc, None, None)
            self.assertEqual(hyb["category"], "Cleanliness")
            self.assertEqual(hyb["status"], "RULE_BASED")
            self.assertNotEqual(raw["department"], hyb["department"])

    def test_analyze_flow_unchanged_except_new_optional_key(self):
        for c in self.base["cases"]:
            got = self.analyze(c["title"], c["description"])
            got.pop("generatedAt", None)
            got.pop("mlPriority", None)          # the only permitted addition
            self.assertEqual(rt(got), c["analyze"], c["description"])
            self.assertIn("priority", got)       # rule-based priority contract preserved

    def test_hybrid_decision_not_influenced_by_model2(self):
        """Hybrid classification must be identical with Model 2 enabled or unavailable."""
        from unittest.mock import patch
        c = self.base["cases"][3]
        with patch("app.services.priority_service.get_priority_model", return_value=None):
            off = self.analyze(c["title"], c["description"])
        on = self.analyze(c["title"], c["description"])
        self.assertEqual(rt(off["classification"]), rt(on["classification"]))
        self.assertEqual(rt(off["priority"]), rt(on["priority"]))


if __name__ == "__main__":
    unittest.main()
