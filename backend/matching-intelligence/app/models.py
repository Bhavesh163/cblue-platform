from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ServiceDefinition(BaseModel):
    key: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")
    aliases: list[str] = Field(min_length=1, max_length=120)
    typo_aliases: list[str] = Field(default_factory=list, max_length=120)

    @field_validator("aliases", "typo_aliases")
    @classmethod
    def validate_aliases(cls, aliases: list[str]) -> list[str]:
        cleaned = [alias.strip() for alias in aliases if alias.strip()]
        if any(len(alias) > 180 for alias in cleaned):
            raise ValueError("Service aliases must not exceed 180 characters")
        return list(dict.fromkeys(cleaned))


class AnalyzeRequest(BaseModel):
    schema_version: Literal["1"] = "1"
    catalog_version: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=5000)
    catalog: list[ServiceDefinition] = Field(min_length=1, max_length=200)


class ServiceIntent(BaseModel):
    canonical_key: str
    confidence: float = Field(ge=0, le=1)
    method: Literal["exact", "fuzzy", "semantic"]
    matched_alias: str
    quantity: float | None = Field(default=None, gt=0, lt=1_000_000)
    unit: Literal["sqm", "page", "faq", "unit", "job", "room", "floor"] | None = None


class AnalyzeResponse(BaseModel):
    schema_version: Literal["1"] = "1"
    catalog_version: str
    language: Literal["thai", "english", "chinese", "mixed", "unknown"]
    normalized_text: str
    intents: list[ServiceIntent]
    semantic_applied: bool = False
    engine_version: str
