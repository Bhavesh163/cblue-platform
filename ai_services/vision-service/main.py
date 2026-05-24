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


# ---------------------------------------------------------------------------
# File compression endpoints
# Target: ≤ 0.3 MB (307,200 bytes) per file
# Supports: JPEG, PNG, WEBP (via Pillow) | PDF (via pypdf)
# ---------------------------------------------------------------------------

TARGET_BYTES = 307_200  # 0.3 MB

from fastapi.responses import StreamingResponse

@app.post("/compress/image",
          summary="Compress an image to ≤ 0.3 MB",
          response_description="Compressed JPEG bytes")
async def compress_image(file: UploadFile = File(...)):
    """
    Multi-pass JPEG compression targeting ≤ 0.3 MB.

    Pass 1 — scale to max 1200 px wide, quality 85
    Pass 2 — scale to max 900 px wide, quality 70
    Pass 3 — scale to max 700 px wide, quality 55
    Pass 4 — keep scaling down by 80% at quality 40 until target reached

    Accepts: image/jpeg, image/png, image/webp, image/gif
    Returns: image/jpeg
    """
    from PIL import Image as PILImage  # already in requirements.txt

    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")

    raw = await file.read()
    img = PILImage.open(io.BytesIO(raw))

    # Convert RGBA / palette → RGB (required for JPEG output)
    if img.mode in ("RGBA", "P", "LA"):
        bg = PILImage.new("RGB", img.size, (255, 255, 255))
        src = img.convert("RGBA") if img.mode != "RGBA" else img
        bg.paste(src, mask=src.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    passes = [
        (1200, 85),
        (900,  70),
        (700,  55),
    ]

    result_bytes = raw  # fallback: return original if already small

    for max_w, quality in passes:
        buf = io.BytesIO()
        w, h = img.size
        if w > max_w:
            new_h = int(h * max_w / w)
            img = img.resize((max_w, new_h), PILImage.LANCZOS)
        img.save(buf, format="JPEG", optimize=True, quality=quality)
        result_bytes = buf.getvalue()
        if len(result_bytes) <= TARGET_BYTES:
            break
    else:
        # Extra passes: keep shrinking 80 % until target reached
        while len(result_bytes) > TARGET_BYTES:
            buf = io.BytesIO()
            w, h = img.size
            img = img.resize((int(w * 0.8), int(h * 0.8)), PILImage.LANCZOS)
            img.save(buf, format="JPEG", optimize=True, quality=40)
            result_bytes = buf.getvalue()
            if w <= 50:  # safety: stop if image is tiny
                break

    return StreamingResponse(
        io.BytesIO(result_bytes),
        media_type="image/jpeg",
        headers={
            "Content-Disposition": f'attachment; filename="compressed.jpg"',
            "X-Original-Size": str(len(raw)),
            "X-Compressed-Size": str(len(result_bytes)),
        },
    )


@app.post("/compress/pdf",
          summary="Compress a PDF to ≤ 0.3 MB",
          response_description="Compressed PDF bytes")
async def compress_pdf(file: UploadFile = File(...)):
    """
    PDF compression using pypdf (deflate on content streams).
    For heavier compression, install Ghostscript on the server
    and the service will automatically prefer it.

    Accepts: application/pdf
    Returns: application/pdf
    """
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only application/pdf is accepted")

    raw = await file.read()

    # ------------------------------------------------------------------
    # Strategy 1: Ghostscript (best quality, needs system install)
    # ------------------------------------------------------------------
    try:
        import subprocess
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_in:
            tmp_in.write(raw)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", "_compressed.pdf")

        result = subprocess.run(
            [
                "gs",
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dPDFSETTINGS=/screen",  # /screen = ~72 dpi — smallest output
                "-dNOPAUSE", "-dQUIET", "-dBATCH",
                f"-sOutputFile={tmp_out_path}",
                tmp_in_path,
            ],
            capture_output=True,
            timeout=30,
        )

        if result.returncode == 0:
            compressed = open(tmp_out_path, "rb").read()
            os.unlink(tmp_in_path)
            os.unlink(tmp_out_path)
            return StreamingResponse(
                io.BytesIO(compressed),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": 'attachment; filename="compressed.pdf"',
                    "X-Original-Size": str(len(raw)),
                    "X-Compressed-Size": str(len(compressed)),
                    "X-Compression-Method": "ghostscript",
                },
            )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass  # Ghostscript not available — fall through to pypdf

    # ------------------------------------------------------------------
    # Strategy 2: pypdf deflate compression (no system deps needed)
    # ------------------------------------------------------------------
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(io.BytesIO(raw))
        writer = PdfWriter()

        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)

        if reader.metadata:
            writer.add_metadata(reader.metadata)

        out_buf = io.BytesIO()
        writer.write(out_buf)
        compressed = out_buf.getvalue()

        return StreamingResponse(
            io.BytesIO(compressed),
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="compressed.pdf"',
                "X-Original-Size": str(len(raw)),
                "X-Compressed-Size": str(len(compressed)),
                "X-Compression-Method": "pypdf",
            },
        )
    except Exception as e:
        raise HTTPException(500, f"PDF compression failed: {e}")

