from __future__ import annotations

import hmac
import os

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .matcher import ENGINE_VERSION, analyze
from .models import AnalyzeRequest, AnalyzeResponse

app = FastAPI(
    title="CBLUE Matching Intelligence",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def require_internal_key(
    x_matching_intelligence_key: str | None = Header(default=None),
) -> None:
    expected = os.getenv("MATCHING_INTELLIGENCE_API_KEY", "")
    if not expected or not x_matching_intelligence_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if not hmac.compare_digest(expected, x_matching_intelligence_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engineVersion": ENGINE_VERSION}


@app.post(
    "/v1/analyze-service-request",
    response_model=AnalyzeResponse,
    dependencies=[Depends(require_internal_key)],
)
def analyze_service_request(request: AnalyzeRequest) -> AnalyzeResponse:
    return analyze(request)
