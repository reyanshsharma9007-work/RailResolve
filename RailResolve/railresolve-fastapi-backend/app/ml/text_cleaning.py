# app/ml/text_cleaning.py
# SINGLE source of truth for text normalisation. The training script and the
# serving code both import clean_text() from here, so train/serve skew from
# different preprocessing is impossible by construction.

import html
import re

_URL = re.compile(r"(?:https?://|www\.)\S+|\bt\.co/\S+", re.I)
_EMAIL = re.compile(r"\S+@\S+\.\S+")
_MENTION = re.compile(r"@\w+")
_HASHTAG = re.compile(r"#\w+")
# Latin letters or Devanagari only: drops digits (PNRs, train numbers, phone
# numbers), punctuation, emoji and leftover mojibake fragments in one step.
_TOKEN = re.compile(r"[a-z]+|[\u0900-\u097f]+")


def _fix_mojibake(text: str) -> str:
    """Repair UTF-8 that was mis-decoded as cp1252 (e.g. 'Ã¢â‚¬â„¢'). Best effort."""
    if not any(ch in text for ch in ("Ã", "Â", "â", "à")):
        return text
    try:
        return text.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def clean_text(text) -> str:
    """lowercase; strip URLs, e-mails, @mentions, #hashtags, HTML entities,
    digits and punctuation; return space-joined tokens (len >= 2)."""
    if not isinstance(text, str):
        return ""
    text = html.unescape(html.unescape(text))  # handles '&amp;amp;'
    text = _fix_mojibake(text)
    text = text.lower()
    text = _URL.sub(" ", text)
    text = _EMAIL.sub(" ", text)
    text = _MENTION.sub(" ", text)
    text = _HASHTAG.sub(" ", text)
    return " ".join(t for t in _TOKEN.findall(text) if len(t) >= 2)
