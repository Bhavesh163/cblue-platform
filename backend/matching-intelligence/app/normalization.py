from __future__ import annotations

import re
import unicodedata

from opencc import OpenCC
from pythainlp.util import normalize as normalize_thai

THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
PUNCTUATION = re.compile(r"[‐‑‒–—―&/+_,;:()\[\]{}\"'`~!?。，“”‘’、]+")
WHITESPACE = re.compile(r"\s+")
THAI_RANGE = re.compile(r"[\u0E00-\u0E7F]")
HAN_RANGE = re.compile(r"[\u3400-\u9FFF]")
LATIN_RANGE = re.compile(r"[A-Za-z]")

_traditional_to_simplified = OpenCC("t2s")


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).translate(THAI_DIGITS).lower()
    normalized = normalize_thai(normalized)
    normalized = _traditional_to_simplified.convert(normalized)
    normalized = PUNCTUATION.sub(" ", normalized)
    return WHITESPACE.sub(" ", normalized).strip()


def compact_text(value: str) -> str:
    return re.sub(r"[\s.\-]+", "", normalize_text(value))


def detect_language(value: str) -> str:
    has_thai = bool(THAI_RANGE.search(value))
    has_han = bool(HAN_RANGE.search(value))
    has_latin = bool(LATIN_RANGE.search(value))
    detected = sum((has_thai, has_han, has_latin))
    if detected > 1:
        return "mixed"
    if has_thai:
        return "thai"
    if has_han:
        return "chinese"
    if has_latin:
        return "english"
    return "unknown"
