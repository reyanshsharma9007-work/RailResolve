import os
os.environ.setdefault("INTERNAL_SERVICE_TOKEN", "test-token")

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.rail_ai import analyze
from app.services.assistant import answer_question
from app.services.ticket_scanner import extract_ticket_fields
from pypdf import PdfWriter
import io

class AIRulesTests(unittest.TestCase):
    @staticmethod
    def _valid_pdf_bytes():
        output = io.BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        writer.write(output)
        return output.getvalue()

    def test_unknown_classification_requires_review(self):
        result = analyze("Unusual issue", "Something not covered by the supported taxonomy")
        self.assertEqual(result["classification"]["status"], "HUMAN_REVIEW_REQUIRED")

    def test_duplicate_baseline(self):
        result = analyze("Dirty coach", "The coach toilet is dirty", candidates=[type("C", (), {"text":"The coach toilet is dirty", "complaintId":"abc"})()])
        self.assertTrue(result["duplicate"]["isDuplicate"])
        self.assertEqual(result["duplicate"]["status"], "RULE_BASED_BASELINE")
        self.assertIn("token_jaccard", result["duplicate"]["method"])

    def test_summarization(self):
        result = analyze("Water issue", "No drinking water is available. Please refill the coach dispenser.")
        self.assertTrue(result["summary"])
        self.assertLessEqual(len(result["summary"]), 320)

    def test_assistant_is_grounded_rule_based(self):
        result = answer_question("What is my complaint status?", {"complaints": [{"referenceNumber":"RR1","status":"SUBMITTED"}], "journeys": []})
        self.assertTrue(result["grounded"])
        self.assertEqual(result["status"], "RULE_BASED")

    def test_ticket_scanner_validation(self):
        fields = extract_ticket_fields("PNR: 1234567890 Train No: 12345 From: Jaipur To: Delhi Date: 01/10/2026 Coach: S1 Seat: 42")
        self.assertEqual(fields["pnr"], "1234567890")
        self.assertEqual(fields["trainNumber"], "12345")
        self.assertEqual(fields["coach"], "S1")


    def test_ticket_scan_valid_pdf_requires_confirmation(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.pdf", self._valid_pdf_bytes(), "application/pdf")}
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["requiresConfirmation"])
        self.assertEqual(payload["status"], "DATA_PENDING")

    def test_ticket_scan_oversized_file_rejected(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.pdf", b"x" * (10 * 1024 * 1024 + 1), "application/pdf")},
        )
        self.assertEqual(response.status_code, 413)

    def test_ticket_scan_ocr_failure_is_safe(self):
        client = TestClient(app)
        with patch("app.api.ai.ocr_bytes", return_value=("", ["OCR unavailable"], "FAILED")):
            response = client.post(
                "/internal/ai/ticket-scan",
                headers={"Authorization": "Bearer test-token"},
                files={"file": ("ticket.png", b"fake-image", "image/png")},
            )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "FAILED")
        self.assertTrue(payload["requiresConfirmation"])
        self.assertIn("OCR unavailable", payload["warnings"])

    def test_known_classification_keeps_concepts_separate(self):
        result = analyze("Dirty coach toilet", "The coach toilet is dirty")
        classification = result["classification"]
        self.assertEqual(classification["category"], "Cleanliness")
        self.assertEqual(classification["subcategory"], "Cleanliness")
        self.assertEqual(classification["department"], "STATION_MAINTENANCE")

    def test_duplicate_unrelated_and_empty(self):
        unrelated = analyze("Food issue", "The pantry meal was cold", candidates=[
            type("C", (), {"text": "The coach toilet is dirty", "complaintId": "abc"})()
        ])
        empty = analyze("Issue", "x", candidates=[])
        self.assertFalse(unrelated["duplicate"]["isDuplicate"])
        self.assertEqual(empty["duplicate"]["status"], "RULE_BASED_BASELINE")

    def test_duplicate_similar_baseline(self):
        result = analyze("Dirty coach toilet", "The toilet in my coach is dirty", candidates=[
            type("C", (), {"text": "Coach toilet is dirty and needs cleaning", "complaintId": "similar"})()
        ])
        self.assertEqual(result["duplicate"]["status"], "RULE_BASED_BASELINE")
        self.assertGreater(result["duplicate"]["similarity"], 0)

    def test_summarization_empty_and_punctuation(self):
        self.assertEqual(analyze("Fallback title", "").get("summary"), "Fallback title")
        result = analyze("Delay", "Train delayed!!! Please help? Still waiting.")
        self.assertTrue(result["summary"])

    def test_ticket_invalid_mime_and_signature(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.txt", b"hello", "text/plain")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "FAILED")

        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.pdf", b"not-a-pdf", "application/pdf")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "FAILED")

    def test_assistant_unknown_is_not_fabricated(self):
        result = answer_question("What is the railway refund law for 2037?", {})
        self.assertFalse(result["grounded"])
        self.assertEqual(result["intent"], "UNKNOWN")

    def test_assistant_endpoint_failure_is_safe(self):
        client = TestClient(app)
        with patch("app.api.ai.answer_question", side_effect=RuntimeError("provider down")):
            response = client.post(
                "/internal/ai/assistant",
                headers={"Authorization": "Bearer test-token"},
                json={"question": "hello", "context": {}},
            )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["message"], "AI Assistant is currently unavailable. Please try again.")


    def _valid_png_bytes(self):
        from PIL import Image
        output = io.BytesIO()
        Image.new("RGB", (2, 2), "white").save(output, format="PNG")
        return output.getvalue()

    def _valid_jpeg_bytes(self):
        from PIL import Image
        output = io.BytesIO()
        Image.new("RGB", (2, 2), "white").save(output, format="JPEG")
        return output.getvalue()

    def test_ticket_scan_valid_png(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.png", self._valid_png_bytes(), "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["requiresConfirmation"])
        self.assertIn(response.json()["status"], {"IMPLEMENTED", "DATA_PENDING", "FAILED"})

    def test_ticket_scan_valid_jpeg(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.jpg", self._valid_jpeg_bytes(), "image/jpeg")},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["requiresConfirmation"])
        self.assertIn(response.json()["status"], {"IMPLEMENTED", "DATA_PENDING", "FAILED"})

    def test_ticket_scan_corrupt_image_is_controlled(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.png", b"\x89PNG\r\n\x1a\ncorrupt", "image/png")},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "FAILED")
        self.assertEqual(payload["extracted"], {})
        self.assertTrue(payload["warnings"])

    def test_ticket_scan_corrupt_pdf_is_controlled(self):
        client = TestClient(app)
        response = client.post(
            "/internal/ai/ticket-scan",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("ticket.pdf", b"%PDF-1.7 corrupt", "application/pdf")},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "FAILED")
        self.assertEqual(payload["extracted"], {})
        self.assertTrue(payload["warnings"])

    def test_fastapi_internal_auth_rejects_unauthorized(self):
        client = TestClient(app)
        response = client.post("/internal/ai/assistant", json={"question":"hello","context":{}})
        self.assertEqual(response.status_code, 401)

if __name__ == "__main__":
    unittest.main()
