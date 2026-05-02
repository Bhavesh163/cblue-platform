import os
import io
import json
import httpx

def ocr_image_typhoon(image_bytes: bytes) -> str:
    # Use explicitly requested key and model
    api_key = "sk-9QMPk7A1MYzAGi7dgjTldnK7DB9Ion8fRkiGC1uIX632Fg9y"
    
    # 1. OCR the image to extract raw text (Typhoon OCR playground API)
    ocr_headers = {
        "Authorization": f"Bearer {api_key}"
    }
    ocr_files = {
        "file": ("image.jpg", image_bytes, "image/jpeg")
    }
    
    extracted_text = ""
    try:
        with httpx.Client(timeout=60.0) as client:
            ocr_res = client.post("https://api.opentyphoon.ai/v1/ocr", headers=ocr_headers, files=ocr_files)
            ocr_res.raise_for_status()
            
            ocr_data = ocr_res.json()
            if ocr_data.get("results"):
                for result in ocr_data["results"]:
                    if result.get("success") and result.get("message"):
                        content_str = result["message"]["choices"][0]["message"]["content"]
                        try:
                            content_json = json.loads(content_str)
                            extracted_text += content_json.get("natural_text", "") + "\n"
                        except json.JSONDecodeError:
                            extracted_text += content_str + "\n"
                            
        extracted_text = extracted_text.strip()
        if not extracted_text:
            return "[Typhoon OCR error: No text extracted from image]"
            
        # 2. Pass extracted text to the specified LLM (Typhoon-v2.5-30b-a3b-instruct)
        # For "Document Understanding" / "PDF Parsing V2" extraction logic
        llm_headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        system_prompt = """You are a world-class enterprise AI Verification Assistant for CBLUE platform.
Your task is to analyze OCR text from KYC documents, portfolios, licenses, or certificates.
Extract structured information with high accuracy. Find dates, names, license numbers, project experience, and identify if the document acts as identity verification or a professional credential. Do not hallucinate external facts. Translate concepts to English but retain original Thai names and numbers."""

        llm_payload = {
            "model": "Typhoon-v2.5-30b-a3b-instruct",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"Extract and format all details clearly from this OCR text:\n\n{extracted_text}"
                }
            ],
            "max_tokens": 1500,
            "temperature": 0.1
        }
        
        with httpx.Client(timeout=60.0) as client:
            llm_res = client.post("https://api.opentyphoon.ai/v1/chat/completions", headers=llm_headers, json=llm_payload)
            llm_res.raise_for_status()
            llm_data = llm_res.json()
            return llm_data['choices'][0]['message']['content'].strip()
            
    except Exception as e:
        # If the LLM call fails but OCR succeeded, return the OCR text as a fallback
        if extracted_text:
            return extracted_text
        return f"[Typhoon OCR error: {e}]"
