import os
import io
import base64
import httpx

def ocr_image_typhoon(image_bytes: bytes) -> str:
    # Use explicitly requested key and model
    api_key = "sk-9QMPk7A1MYzAGi7dgjTldnK7DB9Ion8fRkiGC1uIX632Fg9y"
    
    encoded_img = base64.b64encode(image_bytes).decode('utf-8')
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Use the requested instruction model
    payload = {
        "model": "Typhoon-v2.5-30b-a3b-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all text from this image exactly as written. If it is an ID card, license, certificate, or portfolio, extract all details clearly."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_img}"}}
                ]
            }
        ],
        "max_tokens": 1500,
        "temperature": 0.1
    }
    
    try:
        # We use a timeout since AI calls take some time
        with httpx.Client(timeout=30.0) as client:
            response = client.post("https://api.opentyphoon.ai/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content'].strip()
    except Exception as e:
        return f"[Typhoon OCR error: {e}]"
