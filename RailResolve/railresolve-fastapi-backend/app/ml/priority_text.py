# app/ml/priority_text.py
# Text normalisation for Model 2 (priority). Deliberately SEPARATE from Model 1's
# app/ml/text_cleaning.py: that cleaner drops digits and non-Latin scripts, but
# "garbage not collected for 5 days" vs "3 days" carries urgency signal, and
# negations ("not") must survive. Training and serving both import this function.

import html
import re

_URL = re.compile(r"(?:https?://|www\.)\S+", re.I)
_EMAIL = re.compile(r"\S+@\S+\.\S+")
_MENTION = re.compile(r"@\w+")
_PUNCT = re.compile(r"[^\w\s]|_", re.UNICODE)
_WS = re.compile(r"\s+")


def normalize_priority_text(text) -> str:
    """lowercase, strip URLs/e-mails/@mentions/HTML entities/punctuation; keep
    digits and all unicode letters; collapse whitespace."""
    if not isinstance(text, str):
        return ""
    text = html.unescape(text).lower()
    text = _URL.sub(" ", text)
    text = _EMAIL.sub(" ", text)
    text = _MENTION.sub(" ", text)
    text = _PUNCT.sub(" ", text)
    return _WS.sub(" ", text).strip()


def build_priority_input(title: str, description: str) -> str:
    """The single place that decides how title+description become model input."""
    return normalize_priority_text(f"{title or ''} {description or ''}")
