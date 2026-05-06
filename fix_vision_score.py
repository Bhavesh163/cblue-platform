import sys
path = "ai_services/vision-service/main.py"
content = open(path).read()

if "score_registration" not in content:
    new_code = """
class RegistrationData(BaseModel):
    experience_years: int
    skills: list[str]
    profile_completeness: int
    has_price_list: bool
    ocr_texts: list[str]

@app.post("/score-registration")
async def score_registration(data: RegistrationData):
    from typhoon import ocr_image_typhoon
    import httpx
    # Use LLM directly to score
    api_key = "sk-9QMPk7A1MYzAGi7dgjTldnK7DB9Ion8fRkiGC1uIX632Fg9y"
    llm_headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    combined_ocr = "\n".join(data.ocr_texts)[:5000]

    system_prompt = \"\"\"You are a world-class enterprise AI Verification Assistant for CBLUE platform.
Evaluate this partner registration and return a STRICT JSON output with scores.
Score breakdown (100 max):
- Experience (0-25)
- Skills Breadth (0-15)
- KYC Verification (0-15)
- Portfolio & Evidence (0-15)
- Profile Completeness (0-10)
- Price List (0-10)
- Credential Verification (0-10)
Also provide tier: Economy, Standard, Corporate, Specialist, or Expert.
Output JSON MUST look exactly like:
{ "score": 85, "breakdown": { "experience": 20, "skills": 12, "kyc": 15, "portfolio": 10, "profile": 10, "price": 10, "credential": 8 }, "tier": "Specialist", "hints": ["Hint 1"] }
\"\"\"
    user_prompt = f\"\"\"
Partner stats:
Exp: {data.experience_years}
Skills count: {len(data.skills)}
Completeness: {data.profile_completeness}/100
Price list: {data.has_price_list}
OCR Texts (Portfolio/KYC):
{combined_ocr}
    \"\"\"
    llm_payload = {
        "model": "Typhoon-v2.5-30b-a3b-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 500,
        "temperature": 0.1
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            llm_res = client.post("https://api.opentyphoon.ai/v1/chat/completions", headers=llm_headers, json=llm_payload)
            llm_res.raise_for_status()
            llm_data = llm_res.json()
            import json
            raw = llm_data['choices'][0]['message']['content'].strip()
            # find JSON block
            import re
            m = re.search(r'\{.*\}', raw, re.DOTALL)
            if m: raw = m.group(0)
            return json.loads(raw)
    except Exception as e:
        return {
            "score": 60,
            "breakdown": {"experience": 15, "skills": 10, "kyc": 10, "portfolio": 5, "profile": 10, "price": 10, "credential": 0},
            "tier": "Standard",
            "hints": [f"AI scoring failed gracefully: {e}"]
        }
"""
    # Insert before @app.get("/health")
    content = content.replace('@app.get("/health")', new_code + '\n\n@app.get("/health")')
    open(path, "w").write(content)
    print("Scoring API added!")
else:
    print("Already exists")
