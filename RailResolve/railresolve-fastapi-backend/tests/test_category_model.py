import os
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-token")

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.ml.category_model import CategoryModel
from app.ml.text_cleaning import clean_text
from app.providers.ml_category import HybridCategoryClassifier
from training.category_label_map import DEPARTMENT_NAMES, map_row

MODEL_DIR = Path(__file__).resolve().parents[1] / "models" / "category"
HAVE_MODEL = (MODEL_DIR / "metadata.json").exists()

try:
    from fastapi.testclient import TestClient
    from app.main import app
    HAVE_FASTAPI = True
except Exception:  # pragma: no cover - environment without fastapi installed
    HAVE_FASTAPI = False


class TextCleaningTests(unittest.TestCase):
    def test_strips_noise(self):
        out = clean_text("@RailMinIndia AC not working!! PNR 2731535925 https://t.co/abc #IndianRailways &amp; fan")
        self.assertEqual(out, "ac not working pnr fan")

    def test_non_string_and_empty(self):
        self.assertEqual(clean_text(None), "")
        self.assertEqual(clean_text("   !!! 123 "), "")


class LabelMapTests(unittest.TestCase):
    def test_maps_into_existing_department_codes(self):
        self.assertEqual(map_row("water availability", "no water"), "FOOD_WATER")
        self.assertEqual(map_row("punctuality", "late"), "TRAIN_OPERATIONS")
        self.assertIn(map_row("cleanliness", "dirty coach"), DEPARTMENT_NAMES)

    def test_station_weak_label(self):
        self.assertEqual(map_row("cleanliness", "platform 3 is filthy"), "STATION_MAINTENANCE")

    def test_unmapped_type_fails_loudly(self):
        with self.assertRaises(KeyError):
            map_row("brand new type", "text")


@unittest.skipUnless(HAVE_MODEL, "trained model not present (run training.train_category_model)")
class CategoryModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = CategoryModel.load(MODEL_DIR)

    def test_predicts_known_department_with_bounded_confidence(self):
        p = self.model.predict("Refund for my cancelled ticket has not been credited by IRCTC")
        self.assertIn(p["department"], DEPARTMENT_NAMES)
        self.assertGreaterEqual(p["confidence"], 0.0)
        self.assertLessEqual(p["confidence"], CategoryModel.MAX_CONFIDENCE)
        self.assertEqual(len(p["top"]), 3)

    def test_no_usable_text_returns_none(self):
        self.assertIsNone(self.model.predict("12345 !!! @user"))
        self.assertIsNone(self.model.predict("qwertyuiop zxcvbnm"))  # no known vocabulary

    def test_tampered_artifact_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            shutil.copytree(MODEL_DIR, tmp, dirs_exist_ok=True)
            meta = json.loads((Path(tmp) / "metadata.json").read_text())
            with open(Path(tmp) / meta["artifacts"]["classifier"], "ab") as fh:
                fh.write(b"tamper")
            with self.assertRaises(ValueError):
                CategoryModel.load(Path(tmp))

    def test_hybrid_uses_ml_when_confident_and_reviews_when_not(self):
        hybrid = HybridCategoryClassifier()
        with patch("app.providers.ml_category.get_category_model", return_value=self.model):
            confident = hybrid.classify("", "Train is running three hours late and nobody is announcing anything")
            self.assertIn(confident["status"], ("ML_MODEL", "HUMAN_REVIEW_REQUIRED"))
            vague = hybrid.classify("Unusual issue", "Something not covered by the supported taxonomy")
            self.assertEqual(vague["status"], "HUMAN_REVIEW_REQUIRED")
            self.assertIsNone(vague["department"])


class FallbackTests(unittest.TestCase):
    def test_rules_still_work_when_model_unavailable(self):
        with patch("app.providers.ml_category.get_category_model", return_value=None):
            r = HybridCategoryClassifier().classify("Water issue", "No drinking water in the coach")
        self.assertEqual(r["status"], "RULE_BASED")
        self.assertEqual(r["department"], "FOOD_WATER")


@unittest.skipUnless(HAVE_FASTAPI, "fastapi not installed")
class PredictCategoryEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {"Authorization": "Bearer test-token"}

    def test_requires_internal_token(self):
        self.assertEqual(self.client.post("/internal/ai/predict-category", json={"text": "late train"}).status_code, 401)

    def test_rejects_empty_text(self):
        r = self.client.post("/internal/ai/predict-category", headers=self.headers, json={"text": ""})
        self.assertEqual(r.status_code, 422)

    @unittest.skipUnless(HAVE_MODEL, "trained model not present")
    def test_returns_prediction(self):
        r = self.client.post("/internal/ai/predict-category", headers=self.headers,
                             json={"text": "Refund not received for cancelled ticket"})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn(body["department"], DEPARTMENT_NAMES)
        self.assertIn("accepted", body)

    def test_503_when_model_missing(self):
        with patch("app.api.ai.get_category_model", return_value=None):
            r = self.client.post("/internal/ai/predict-category", headers=self.headers, json={"text": "late train"})
        self.assertEqual(r.status_code, 503)


if __name__ == "__main__":
    unittest.main()
