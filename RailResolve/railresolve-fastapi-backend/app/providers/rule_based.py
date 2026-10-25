import re
from typing import Iterable
from app.config import settings
from app.providers.interfaces import Classifier, PriorityPredictor, DuplicateDetector, Summarizer, AssistantProvider, TicketExtractor

CATEGORY_RULES = [
    (["refund", "money back", "cancellation", "cancelled", "payment"], "Refund / Payment", "BOOKING_REFUND"),
    (["booking", "book ticket", "reservation", "payment failed"], "Booking / Ticket", "BOOKING_REFUND"),
    (["ticket", "berth", "seat", "tte", "conductor"], "Ticket / Berth", "TICKET_TTE"),
    (["food", "meal", "pantry", "catering", "overcharg"], "Food / Catering", "FOOD_WATER"),
    (["water", "drinking water"], "Water Availability", "FOOD_WATER"),
    (["clean", "dirty", "hygiene", "toilet", "restroom", "garbage"], "Cleanliness", "STATION_MAINTENANCE"),
    (["escalator", "lift", "platform", "waiting hall", "station"], "Station Facility", "STATION_MAINTENANCE"),
    (["ac", "air condition", "fan", "light", "charging", "electrical", "door lock"], "Coach Maintenance", "TRAIN_MAINTENANCE"),
    (["delay", "late", "halt", "route", "punctual"], "Operations", "TRAIN_OPERATIONS"),
    (["security", "theft", "harass", "unsafe", "fight", "threat"], "Security / Safety", "TRAIN_OPERATIONS"),
    (["medical", "doctor", "injury", "emergency", "ambulance"], "Medical / Emergency", "GENERAL_SUPPORT"),
]
STOP = {"the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "or", "in", "on", "for", "my", "i", "it", "this", "that", "with", "from"}


def tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP and len(t) > 1}


class RuleBasedClassifier(Classifier):
    def classify(self, title, description, requested_category=None, requested_department=None):
        text = f"{title} {description}".lower()
        for keywords, subcategory, department in CATEGORY_RULES:
            hits = sum(1 for k in keywords if k in text)
            if hits:
                confidence = min(0.55 + hits * 0.1, 0.9)
                return {"category": subcategory, "subcategory": subcategory, "department": department,
                        "confidence": round(confidence, 2), "status": "RULE_BASED",
                        "reason": f"Matched operational keywords: {', '.join([k for k in keywords if k in text][:3])}"}
        return {"category": requested_category, "subcategory": None, "department": requested_department,
                "confidence": 0.0, "status": "HUMAN_REVIEW_REQUIRED",
                "reason": "No safe rule matched the complaint text."}



class RuleBasedPriorityPredictor(PriorityPredictor):
    def predict(self, title, description):
        text = f"{title} {description}".lower()

        critical_terms = [
            "fire", "smoke", "bomb", "explosion", "major injury",
            "unconscious", "medical emergency", "attack", "weapon",
            "live electrical wire", "exposed live wire",
            "exposed electrical wire", "electrical fire"
        ]

        high_terms = [
            "unsafe", "security", "harassment", "theft", "injury",
            "accident", "electrical hazard", "door open", "brake",
            "serious delay", "exposed wire", "electrical wire"
        ]

        medium_terms = [
            "delay", "refund", "ticket", "dirty", "food",
            "water", "ac", "fan", "light"
        ]

        crit = [x for x in critical_terms if x in text]
        high = [x for x in high_terms if x in text]
        med = [x for x in medium_terms if x in text]

        if crit:
            return {
                "recommendedPriority": "CRITICAL",
                "confidence": 0.95,
                "status": "RULE_BASED",
                "reasons": crit,
                "humanReviewRequired": True
            }

        if high:
            return {
                "recommendedPriority": "HIGH",
                "confidence": 0.85,
                "status": "RULE_BASED",
                "reasons": high,
                "humanReviewRequired": any(
                    x in text for x in [
                        "unsafe", "security", "injury", "accident"
                    ]
                )
            }

        if med:
            return {
                "recommendedPriority": "MEDIUM",
                "confidence": 0.7,
                "status": "RULE_BASED",
                "reasons": med,
                "humanReviewRequired": False
            }

        return {
            "recommendedPriority": "LOW",
            "confidence": 0.55,
            "status": "RULE_BASED",
            "reasons": ["No elevated urgency indicator matched."],
            "humanReviewRequired": False
        }



class RuleBasedDuplicateDetector(DuplicateDetector):
    """RULE_BASED_BASELINE: token Jaccard only; no semantic ML claim."""
    def detect(self, text: str, candidates: Iterable):
        a = tokens(text)
        best = (0.0, None)
        for candidate in candidates:
            b = tokens(candidate.text)
            if not a or not b:
                continue
            score = len(a & b) / len(a | b)
            if score > best[0]:
                best = (score, candidate.complaintId)
        threshold = settings.DUPLICATE_THRESHOLD
        return {"isDuplicate": best[0] >= threshold,
                "duplicateOf": best[1] if best[0] >= threshold else None,
                "similarity": round(best[0], 4), "status": "RULE_BASED_BASELINE",
                "method": f"token_jaccard_threshold_{threshold}"}


class RuleBasedSummarizer(Summarizer):
    def summarize(self, title, description):
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", description.strip()) if s.strip()]
        if not sentences:
            return title.strip()
        summary = sentences[0]
        if len(summary) < 60 and len(sentences) > 1:
            summary = f"{summary} {sentences[1]}"
        return re.sub(r"\s+", " ", summary)[:320].rstrip()


class RuleBasedAssistantProvider(AssistantProvider):
    FAQ = {
        "complaint": "You can report a grievance from the Report page after adding a journey. Each complaint is linked to your journey so it can be routed and tracked.",
        "status": "For your own complaints, use the complaint tracking view. The system shows the current status and status history returned by the backend.",
        "priority": "RailResolve uses LOW, MEDIUM, HIGH, and CRITICAL priorities. Final SLA priority is determined server-side; a passenger-submitted priority does not by itself grant CRITICAL handling.",
        "evidence": "Complaint evidence supports JPEG, PNG, and PDF uploads subject to the configured size limits. Do not upload private tickets or identity documents unless needed for the complaint.",
        "ticket": "The ticket scanner can extract fields from OCR text when OCR support is available. Extracted information must be reviewed and confirmed before it is stored as journey information.",
    }
    def answer(self, question, context):
        q = question.lower()
        if any(x in q for x in ["status", "where is my complaint", "complaint status"]):
            complaints = context.get("complaints", [])
            if complaints:
                lines = [f"{c.get('referenceNumber', 'Complaint')} is {c.get('status', 'unknown')}." for c in complaints[:10]]
                return {"answer": " ".join(lines), "sources": ["Authorized current complaint context"], "confidence": 0.98, "intent": "MY_COMPLAINT_STATUS", "grounded": True, "status": "RULE_BASED"}
            return {"answer": "I could not find an authorized complaint record in the context provided.", "sources": ["Authorized current complaint context"], "confidence": 0.98, "intent": "MY_COMPLAINT_STATUS", "grounded": True, "status": "RULE_BASED"}
        if any(x in q for x in ["my journey", "journey"]):
            journeys = context.get("journeys", [])
            return {"answer": f"You have {len(journeys)} journey record(s) available in your authorized context." if journeys else "No authorized journey information is available in the context provided.",
                    "sources": ["Authorized current journey context"], "confidence": 0.98, "intent": "MY_JOURNEY", "grounded": True, "status": "RULE_BASED"}
        for key, answer in self.FAQ.items():
            if key in q:
                return {"answer": answer, "sources": ["RailResolve application knowledge"], "confidence": 0.9, "intent": key.upper(), "grounded": True, "status": "RULE_BASED"}
        return {"answer": "I do not have grounded information to answer that question. Please use the relevant RailResolve workflow or consult an authorized railway source.", "sources": [], "confidence": 0.0, "intent": "UNKNOWN", "grounded": False, "status": "HUMAN_REVIEW_REQUIRED"}


class RuleBasedTicketExtractor(TicketExtractor):
    def extract(self, text):
        def find(patterns):
            for pattern in patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    return match.group(1).strip()
            return None
        return {
            "pnr": find([r"\bPNR\s*[:#-]?\s*(\d{10})\b", r"\b(\d{10})\b"]),
            "trainNumber": find([r"(?:train\s*(?:no|number)|train)\s*[:#-]?\s*(\d{4,5})\b"]),
            "trainName": find([r"(?:train\s*name)\s*[:#-]?\s*([A-Za-z][A-Za-z0-9 .-]{2,60})"]),
            "passengerName": find([r"(?:passenger|name)\s*[:#-]\s*([A-Za-z][A-Za-z .'-]{1,60})"]),
            "source": find([r"(?:from|source)\s*[:#-]\s*([A-Za-z][A-Za-z .'-]{1,50})"]),
            "destination": find([r"(?:to|destination)\s*[:#-]\s*([A-Za-z][A-Za-z .'-]{1,50})"]),
            "date": find([r"(?:date|journey date)\s*[:#-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})"]),
            "coach": find([r"(?:coach|class)\s*[:#-]\s*([A-Z0-9]{1,6})"]),
            "seat": find([r"(?:seat|berth)\s*[:#-]?\s*([A-Z0-9-]{1,8})"]),
        }
