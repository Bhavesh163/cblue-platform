from fastapi.testclient import TestClient

from app.main import app
from app.matcher import analyze
from app.models import AnalyzeRequest, ServiceDefinition

CATALOG = [
    ServiceDefinition(
        key="construction",
        aliases=["construction", "ก่อสร้าง", "งานก่อสร้าง", "建筑施工", "建築施工"],
        typo_aliases=["constrction"],
    ),
    ServiceDefinition(
        key="website",
        aliases=["website development", "ทำเว็บไซต์", "ทำเวบไซต์", "网站开发", "網站開發"],
        typo_aliases=["webiste development"],
    ),
    ServiceDefinition(
        key="plumbing",
        aliases=["plumbing", "งานประปา", "管道维修", "管道維修"],
        typo_aliases=["pluming"],
    ),
]


def request(text: str) -> AnalyzeRequest:
    return AnalyzeRequest(catalog_version="test", text=text, catalog=CATALOG)


def test_exact_reported_thai_request() -> None:
    result = analyze(request("ก่อสร้าง 500 ตารางเมตร และ ทำเวบไซต์ 20 หน้า"))
    assert [(item.canonical_key, item.quantity, item.unit) for item in result.intents] == [
        ("construction", 500, "sqm"),
        ("website", 20, "page"),
    ]
    assert result.language == "thai"


def test_common_english_typo() -> None:
    result = analyze(request("constrction 500 m2 and webiste development 20 pages"))
    assert {item.canonical_key for item in result.intents} == {"construction", "website"}


def test_simplified_and_traditional_chinese_normalize_to_same_intents() -> None:
    simplified = analyze(request("建筑施工500平方米以及网站开发20页"))
    traditional = analyze(request("建築施工500平方米以及網站開發20頁"))
    assert {item.canonical_key for item in simplified.intents} == {"construction", "website"}
    assert {item.canonical_key for item in traditional.intents} == {"construction", "website"}


def test_ambiguous_unrelated_text_is_not_invented() -> None:
    assert analyze(request("จัดงานวันเกิดสำหรับแขก 500 คน")).intents == []


def test_internal_endpoint_requires_key(monkeypatch) -> None:
    monkeypatch.setenv("MATCHING_INTELLIGENCE_API_KEY", "test-key")
    client = TestClient(app)
    assert (
        client.post(
            "/v1/analyze-service-request", json=request("งานประปา 1 งาน").model_dump()
        ).status_code
        == 401
    )
    response = client.post(
        "/v1/analyze-service-request",
        json=request("งานประปา 1 งาน").model_dump(),
        headers={"x-matching-intelligence-key": "test-key"},
    )
    assert response.status_code == 200
    assert response.json()["intents"][0]["canonical_key"] == "plumbing"
