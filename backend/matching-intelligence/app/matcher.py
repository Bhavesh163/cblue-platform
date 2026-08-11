from __future__ import annotations

import re
from dataclasses import dataclass

from pythainlp.tokenize import word_tokenize
from rapidfuzz import fuzz

from .models import AnalyzeRequest, AnalyzeResponse, ServiceDefinition, ServiceIntent
from .normalization import compact_text, detect_language, normalize_text

ENGINE_VERSION = "cblue-matching-intelligence-1"
FUZZY_MINIMUM = 0.86
FUZZY_MARGIN = 0.06

UNIT_PATTERNS: tuple[tuple[str, str], ...] = (
    (
        r"ตาราง\s*เมตร|ตร\.?\s*ม\.?|平方米|平方公尺|平米|m\s*[²2]|sq\.?\s*m\.?|square\s*met(?:er|re)s?",
        "sqm",
    ),
    (r"pages?|หน้า|页|頁", "page"),
    (r"faqs?|ข้อ|คำถาม|问答|問答|問題|问题", "faq"),
    (r"units?|ชุด", "unit"),
    (r"jobs?|งาน", "job"),
    (r"rooms?|ห้อง|房间|房間", "room"),
    (r"floors?|ชั้น|楼层|樓層", "floor"),
)
SEGMENT_BOUNDARY = re.compile(
    r"[,;\n、，；]+|\s+(?:and|or|plus)\s+|(?:และ|หรือ|พร้อมทั้ง|รวมถึง)|(?:以及|或者|和|及|并且)",
    re.IGNORECASE,
)
NUMBER = r"(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)"
FILLER = re.compile(
    r"\b(?:want|need|require|team|carry|out|for|please|project|service|work|works|the|a|an)\b|"
    r"(?:ต้องการ|ทีมงาน|สำหรับ|ดำเนินการ|ขนาด|จำนวน|งาน)|"
    r"(?:需要|要求|项目|工程|数量)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class AliasCandidate:
    key: str
    alias: str
    normalized: str
    compact: str


def _quantity(segment: str) -> tuple[float | None, str | None]:
    normalized = segment.translate(str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789"))
    for unit_pattern, unit in UNIT_PATTERNS:
        after = re.search(rf"({NUMBER})\s*(?:{unit_pattern})", normalized, re.IGNORECASE)
        before = re.search(rf"(?:{unit_pattern})\s*({NUMBER})", normalized, re.IGNORECASE)
        match = after or before
        if match:
            amount = float(match.group(1).replace(",", ""))
            if 0 < amount < 1_000_000:
                return amount, unit
    return None, None


def _catalog(definitions: list[ServiceDefinition]) -> list[AliasCandidate]:
    candidates: list[AliasCandidate] = []
    for definition in definitions:
        for alias in [*definition.aliases, *definition.typo_aliases]:
            normalized = normalize_text(alias)
            compact = compact_text(alias)
            if normalized and compact:
                candidates.append(
                    AliasCandidate(
                        key=definition.key,
                        alias=alias,
                        normalized=normalized,
                        compact=compact,
                    )
                )
    return sorted(candidates, key=lambda item: len(item.compact), reverse=True)


def _tokenized(value: str) -> str:
    tokens = word_tokenize(value, engine="newmm", keep_whitespace=False)
    return " ".join(token for token in tokens if token.strip())


def _clean_segment(value: str) -> str:
    cleaned = re.sub(NUMBER, " ", value)
    for unit_pattern, _ in UNIT_PATTERNS:
        cleaned = re.sub(unit_pattern, " ", cleaned, flags=re.IGNORECASE)
    return normalize_text(FILLER.sub(" ", cleaned))


def _exact_matches(text: str, candidates: list[AliasCandidate]) -> list[AliasCandidate]:
    normalized = normalize_text(text)
    compact = compact_text(text)
    selected: dict[str, AliasCandidate] = {}
    for candidate in candidates:
        if candidate.normalized in normalized or candidate.compact in compact:
            current = selected.get(candidate.key)
            if current is None or len(candidate.compact) > len(current.compact):
                selected[candidate.key] = candidate
    return list(selected.values())


def _fuzzy_match(
    segment: str, candidates: list[AliasCandidate]
) -> tuple[AliasCandidate, float] | None:
    cleaned = _clean_segment(segment)
    compact = compact_text(cleaned)
    if len(compact) < 4 or len(compact) > 120:
        return None
    tokenized = _tokenized(cleaned)
    scores_by_key: dict[str, tuple[AliasCandidate, float]] = {}
    for candidate in candidates:
        if len(candidate.compact) < 3:
            continue
        compact_score = fuzz.WRatio(compact, candidate.compact) / 100
        token_score = fuzz.token_set_ratio(tokenized, _tokenized(candidate.normalized)) / 100
        score = max(compact_score, token_score)
        existing = scores_by_key.get(candidate.key)
        if existing is None or score > existing[1]:
            scores_by_key[candidate.key] = (candidate, score)
    ranked = sorted(scores_by_key.values(), key=lambda item: item[1], reverse=True)
    if not ranked or ranked[0][1] < FUZZY_MINIMUM:
        return None
    if len(ranked) > 1 and ranked[0][1] - ranked[1][1] < FUZZY_MARGIN:
        return None
    return ranked[0]


def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    candidates = _catalog(request.catalog)
    normalized = normalize_text(request.text)
    segments = [
        segment.strip() for segment in SEGMENT_BOUNDARY.split(request.text) if segment.strip()
    ]
    if not segments:
        segments = [request.text]

    intents_by_key: dict[str, ServiceIntent] = {}
    for segment in segments:
        quantity, unit = _quantity(segment)
        exact = _exact_matches(segment, candidates)
        if exact:
            for candidate in exact:
                intents_by_key[candidate.key] = ServiceIntent(
                    canonical_key=candidate.key,
                    confidence=1,
                    method="exact",
                    matched_alias=candidate.alias,
                    quantity=quantity,
                    unit=unit,
                )
            continue

        fuzzy = _fuzzy_match(segment, candidates)
        if fuzzy:
            candidate, confidence = fuzzy
            existing = intents_by_key.get(candidate.key)
            if existing is None or confidence > existing.confidence:
                intents_by_key[candidate.key] = ServiceIntent(
                    canonical_key=candidate.key,
                    confidence=round(confidence, 4),
                    method="fuzzy",
                    matched_alias=candidate.alias,
                    quantity=quantity,
                    unit=unit,
                )

    return AnalyzeResponse(
        catalog_version=request.catalog_version,
        language=detect_language(request.text),
        normalized_text=normalized,
        intents=list(intents_by_key.values()),
        semantic_applied=False,
        engine_version=ENGINE_VERSION,
    )
