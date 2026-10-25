import io
from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader
from app.providers.rule_based import RuleBasedTicketExtractor

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_BYTES = 10 * 1024 * 1024
JPEG_SIGNATURE = b"\xff\xd8\xff"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PDF_SIGNATURE = b"%PDF-"

extractor = RuleBasedTicketExtractor()


def _signature_matches(data: bytes, mime: str) -> bool:
    if mime == "image/jpeg":
        return data.startswith(JPEG_SIGNATURE)
    if mime == "image/png":
        return data.startswith(PNG_SIGNATURE)
    if mime == "application/pdf":
        return data.startswith(PDF_SIGNATURE)
    return False


def validate_ticket_bytes(data: bytes, mime: str):
    if mime not in ALLOWED_MIME_TYPES:
        return "Unsupported file type."
    if not data:
        return "Uploaded file is empty."
    if len(data) > MAX_FILE_BYTES:
        return "Ticket file is too large."
    if not _signature_matches(data, mime):
        return "File content does not match the declared file type."
    if mime.startswith("image/"):
        try:
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
        except (UnidentifiedImageError, OSError, ValueError):
            return "The image is corrupt or unreadable."
    elif mime == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(data), strict=False)
            if not reader.pages:
                return "The PDF contains no readable pages."
        except Exception:
            return "The PDF is corrupt or unreadable."
    return None


def extract_ticket_fields(text: str):
    return extractor.extract(text)


def ocr_bytes(data: bytes, mime: str):
    validation_error = validate_ticket_bytes(data, mime)
    if validation_error:
        return "", [validation_error], "FAILED"

    warnings = []
    try:
        if mime.startswith("image/"):
            import pytesseract
            with Image.open(io.BytesIO(data)) as image:
                image.load()
                text = pytesseract.image_to_string(image)
        else:
            reader = PdfReader(io.BytesIO(data), strict=False)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:
        # Never expose OCR/PDF library details to the caller.
        return "", ["Ticket text extraction failed. Please verify the file and try again."], "FAILED"

    if not text.strip():
        warnings.append("No readable ticket text was extracted. Review the ticket manually.")
        return "", warnings, "DATA_PENDING"

    return text, warnings, "IMPLEMENTED"
