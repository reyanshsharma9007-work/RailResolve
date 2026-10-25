import os
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-token")

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.ml.priority_model import PriorityModel, load_priority_model, priority_model_status
from app.ml.priority_text import build_priority_input, normalize_priority_text
from app.services import priority_service

ART = Path(__file__).resolve().parents[1] / "artifacts" / "priority"
HAVE = (ART / "metadata.json").exists()
LABELS = {"low", "medium", "high"}   # exactly what CivicDex contains - no CRITICAL

try:
    from fastapi.testclient import TestClient
    from app.main import app
    HAVE_FASTAPI = True
except Exception:  # pragma: no cover
    HAVE_FASTAPI = False


class PriorityTextTests(unittest.TestCase):
    def test_keeps_digits_and_negations(self):
        self.assertEqual(normalize_priority_text("Garbage NOT collected for 5 days!! https://x.co @u"), "garbage not collected for 5 days")

    def test_title_and_description_joined_like_training(self):
        self.assertEqual(build_priority_input("Water", "No supply."), "water no supply")

    def test_non_string(self):
        self.assertEqual(normalize_priority_text(None), "")


@unittest.skipUnless(HAVE, "priority artifact not present (run training.train_priority_model)")
class PriorityModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = PriorityModel.load(ART)
        cls.meta = json.loads((ART / "metadata.json").read_text())

    def test_labels_are_the_dataset_labels(self):
        self.assertEqual(set(self.model.labels), LABELS)
        self.assertEqual(set(self.meta["labels"]), LABELS)

    def test_metadata_completeness(self):
        for key in ("model_version", "target_column", "input_text_field", "labels", "preprocessing", "dataset", "split_strategy",
                    "trained_at", "algorithm", "evaluation", "env", "limitations", "artifact"):
            self.assertIn(key, self.meta)
        self.assertEqual(self.meta["target_column"], "urgency")
        self.assertIsInstance(self.meta["evaluation"], dict, "run training.evaluate_priority_model")

    def test_prediction_shape_and_confidence(self):
        r = self.model.predict("", "Drain is completely blocked and overflowing")
        self.assertIn(r["label"], LABELS)
        self.assertEqual(r["modelVersion"], self.model.version)
        self.assertTrue(self.model.probability_supported)
        self.assertAlmostEqual(sum(r["probabilities"].values()), 1.0, places=2)
        self.assertEqual(r["confidence"], max(r["probabilities"].values()))

    def test_in_domain_examples(self):
        self.assertEqual(self.model.predict("", "How to apply for income certificate")["label"], "low")
        self.assertEqual(self.model.predict("", "Electric pole is leaning and dangerous")["label"], "high")

    def test_empty_and_out_of_vocabulary_abstain(self):
        self.assertIsNone(self.model.predict("", ""))
        self.assertIsNone(self.model.predict("  ", "!!! @@@"))
        self.assertIsNone(self.model.predict("", "qwertyuiop zxcvbnm"))

    def test_missing_artifact(self):
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(FileNotFoundError):
            PriorityModel.load(Path(tmp) / "nope")

    def test_corrupt_artifact_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            shutil.copytree(ART, tmp, dirs_exist_ok=True)
            with open(Path(tmp) / self.meta["artifact"]["file"], "ab") as fh:
                fh.write(b"corrupt")
            with self.assertRaises(ValueError):
                PriorityModel.load(Path(tmp))

    def test_artifact_hash_matches_metadata(self):
        import hashlib
        self.assertEqual(hashlib.sha256((ART / self.meta["artifact"]["file"]).read_bytes()).hexdigest(), self.meta["artifact"]["sha256"])

    def test_model2_artifacts_are_not_in_model1_directory(self):
        m1 = Path(__file__).resolve().parents[1] / "models" / "category"
        self.assertFalse(any("priority" in p.name for p in m1.iterdir()))


@unittest.skipUnless(HAVE, "priority artifact not present")
class PriorityServiceTests(unittest.TestCase):
    def setUp(self):
        load_priority_model(force=True)

    def test_safety_rule_is_never_lowered_by_model(self):
        r = priority_service.predict_priority("Fire", "Smoke and fire reported near the pantry car")
        self.assertEqual(r["safetyRule"]["priority"], "CRITICAL")
        self.assertEqual(r["effectivePriority"], "CRITICAL")
        self.assertTrue(r["advisoryOnly"])

    def test_safety_override_when_model_says_lower(self):
        # model labels this 'medium'; explicit safety terms ('brake', 'door open') must still win
        r = priority_service.predict_priority("", "Brake failure suspected in coach S4, door open while moving")
        self.assertEqual(r["effectivePriority"], "HIGH")
        self.assertEqual(r["safetyRule"]["triggered"], True)

    def test_model_never_emits_critical_alone(self):
        r = priority_service.predict_priority("", "The AC is not working in coach B3")
        self.assertNotEqual(r["recommendedPriority"], "CRITICAL")
        self.assertFalse(r["safetyRule"]["triggered"])

    def test_no_usable_text_does_not_guess(self):
        r = priority_service.predict_priority("", "qwertyuiop zxcvbnm")
        self.assertEqual(r["status"], "NO_USABLE_TEXT")
        self.assertIsNone(r.get("predictedUrgency"))
        self.assertIsNone(r.get("confidence"))

    def test_domain_warning_always_present(self):
        r = priority_service.predict_priority("", "Train is running three hours late")
        self.assertTrue(any("civic" in w for w in r["warnings"]))

    def test_analyze_keeps_rule_priority_and_adds_ml_priority(self):
        from app.services.rail_ai import analyze
        a = analyze("Late train", "Train is running three hours late")
        self.assertIn(a["priority"]["status"], ("RULE_BASED",))
        self.assertEqual(a["mlPriority"]["status"], "ML_MODEL")

    def test_service_degrades_when_model_unavailable(self):
        from app.services.rail_ai import analyze
        with patch("app.services.priority_service.get_priority_model", return_value=None):
            self.assertIsNone(priority_service.predict_priority("a", "b"))
            self.assertIsNone(priority_service.shadow_prediction("a", "b"))
            a = analyze("Dirty toilet", "The toilet in coach S5 is dirty")
        self.assertIsNone(a["mlPriority"])
        self.assertEqual(a["classification"]["category"], "Cleanliness")   # Model 1 path unaffected

    def test_inference_error_is_contained(self):
        with patch("app.services.priority_service._ml.predict", side_effect=RuntimeError("boom")):
            self.assertIsNone(priority_service.shadow_prediction("a", "b"))


class LoaderStateTests(unittest.TestCase):
    def tearDown(self):
        load_priority_model(force=True)

    def test_missing_dir_reports_artifact_missing_and_not_ready(self):
        from app.config import settings
        with patch.object(settings, "PRIORITY_MODEL_DIR", "does/not/exist"):
            self.assertIsNone(load_priority_model(force=True))
            st = priority_model_status()
        self.assertFalse(st["ready"])
        self.assertEqual(st["state"], "ARTIFACT_MISSING")

    def test_disabled_flag(self):
        from app.config import settings
        with patch.object(settings, "PRIORITY_MODEL_ENABLED", False):
            self.assertIsNone(load_priority_model(force=True))
            self.assertEqual(priority_model_status()["state"], "DISABLED")

    @unittest.skipUnless((Path(__file__).resolve().parents[1] / "models" / "category" / "metadata.json").exists(), "Model 1 absent")
    def test_model2_failure_does_not_affect_model1(self):
        from app.config import settings
        from app.ml.category_model import get_category_model
        with patch.object(settings, "PRIORITY_MODEL_DIR", "does/not/exist"):
            load_priority_model(force=True)
        self.assertIsNotNone(get_category_model())


@unittest.skipUnless(HAVE_FASTAPI, "fastapi not installed")
class PriorityEndpointTests(unittest.TestCase):
    H = {"Authorization": "Bearer test-token"}

    def setUp(self):
        self.client = TestClient(app)

    def test_requires_internal_token(self):
        self.assertEqual(self.client.post("/internal/ai/predict-priority", json={"text": "late"}).status_code, 401)
        self.assertEqual(self.client.post("/internal/ai/predict-priority", headers={"Authorization": "Bearer wrong"}, json={"text": "late"}).status_code, 401)

    def test_rejects_empty_and_invalid(self):
        for body in ({}, {"text": ""}, {"title": " ", "description": " "}, {"text": "x" * 4000}):
            self.assertEqual(self.client.post("/internal/ai/predict-priority", headers=self.H, json=body).status_code, 422, body)

    @unittest.skipUnless(HAVE, "artifact absent")
    def test_prediction_response_schema(self):
        r = self.client.post("/internal/ai/predict-priority", headers=self.H, json={"title": "Drain", "description": "Drain is blocked and overflowing"})
        self.assertEqual(r.status_code, 200)
        b = r.json()
        self.assertEqual(b["status"], "ML_MODEL")
        self.assertIn(b["predictedUrgency"], LABELS)
        self.assertIn(b["recommendedPriority"], {"LOW", "MEDIUM", "HIGH"})
        self.assertTrue(b["advisoryOnly"])
        self.assertNotIn("token", json.dumps(b).lower())

    def test_503_when_model_unavailable(self):
        with patch("app.services.priority_service.get_priority_model", return_value=None):
            r = self.client.post("/internal/ai/predict-priority", headers=self.H, json={"text": "late train"})
        self.assertEqual(r.status_code, 503)

    def test_models_health_is_independent(self):
        with patch("app.api.model_status.priority_model_status", return_value={"ready": False, "state": "LOAD_FAILED", "detail": "X", "version": None}):
            b = self.client.get("/health/models").json()
        self.assertFalse(b["priority"]["ready"])
        self.assertIn("ready", b["category"])

    @unittest.skipUnless(HAVE, "artifact absent")
    def test_analyze_endpoint_backward_compatible(self):
        r = self.client.post("/internal/ai/analyze", headers=self.H, json={"complaintId": "t1", "title": "AC", "description": "The AC is not working in coach B3"})
        b = r.json()
        self.assertTrue(b["success"])
        for k in ("classification", "priority", "duplicate", "summary"):
            self.assertIn(k, b["analysis"])
        self.assertEqual(b["analysis"]["priority"]["status"], "RULE_BASED")


if __name__ == "__main__":
    unittest.main()
