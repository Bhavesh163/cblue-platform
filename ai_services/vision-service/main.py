"""
CBLUE AI Vision Service — Portfolio & KYC Document Digestion
"""

import io
import os
import uuid
import base64
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import openai

app = FastAPI(title="CBLUE Vision Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = Path(os.getenv("VISION_STORAGE_DIR", "/tmp/cblue-vision"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 20 * 1024 * 1024

API_KEY = "sk-9QMPk7A1MYzAGi7dgjTldnK7DB9Ion8fRkiGC1uIX632Fg9y"
client = openai.AsyncOpenAI(api_key=API_KEY, base_url="https://api.opentyphoon.ai/v1")

class RegistrationData(BaseModel):
    partner_id: str
    experience_years: int
    skills: list[str]
    has_price_list: bool
    profile_completeness: int
    ocr_texts: list[str]

async def api_typhoon_extract(image_bytes: bytes) -> str:
    """Use Typhoon Vision to extract info"""
    b64 = base64.b64encode(image_bytes).decode('utf-8')
    try:
        response = await client.chat.completions.create(
            model="typhoon-v1.5-vision-preview", # fallback or standard model
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all text and KYC details."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                    ]
                }
            ],
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[Typhoon OCR error: {e}]"

@app.post("/extract/single")
async def extract_single(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Unsupported")
    content = await file.read()
    txt = await api_typhoon_extract(content)
    return {"text": txt}

@app.post("/score/registration")
async def score_registration(data: RegistrationData):
    sys_prompt = "Evaluate partner registration. Return JSON with score 0-100."
    comb = "\\n".join(data.ocr_texts)[:5000]
    prompt = f"Stats: {data.experience_years} yrs, texts: {comb}"
    
    resp = await client.chat.completions.create(
        model="typhoon-v2.5-30b-a3b-instruct",
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": prompt}
        ]
    )
    return {"result": resp.choices[0].message.content}
