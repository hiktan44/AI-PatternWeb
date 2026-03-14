"""AI Analiz Servisi — Gemini API ile görsel ve teknik veri işleme"""
import json
import os
from typing import Any

from app.core.config import settings

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


def _configure_gemini():
    if not GEMINI_AVAILABLE or not settings.GEMINI_API_KEY:
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.0-flash")


CATEGORY_PROMPTS = {
    "visual_analysis": """
Bu bir konfeksiyon ürünü görseli. Aşağıdaki bilgileri JSON formatında çıkar:
{
  "category": "tshirt|shirt|dress|skirt|pants|outerwear",
  "confidence": 0.0-1.0,
  "garment_type": "...",
  "silhouette": "slim|regular|oversize|a-line|...",
  "collar_type": "round|v-neck|button-down|...",
  "sleeve_type": "short|long|sleeveless|...",
  "details": ["pocket", "zipper", "button", ...],
  "estimated_pieces": ["front_body", "back_body", "sleeve", ...],
  "notes": "ek bilgiler"
}
Sadece JSON döndür, başka bir şey yazma.
""",
    "measurement_validation": """
Verilen ölçü tablosu değerlerini analiz et:
1. Ölçüler arasında tutarsızlık var mı?
2. Normal insan vücudu ölçüleriyle uyumlu mu?
3. Beden aralıkları arasında orantısal artış var mı?
JSON formatında:
{
  "valid": true/false,
  "anomalies": [{"measurement": "...", "issue": "..."}],
  "confidence": 0.0-1.0,
  "suggestions": ["..."]
}
""",
}


async def analyze_image(file_path: str) -> dict[str, Any]:
    """Görsel dosyasını AI ile analiz et"""
    model = _configure_gemini()
    if not model:
        return {
            "category": "tshirt",
            "confidence": 0.75,
            "garment_type": "Basic T-Shirt (demo)",
            "silhouette": "regular",
            "collar_type": "round",
            "sleeve_type": "short",
            "details": [],
            "estimated_pieces": ["front_body", "back_body", "sleeve_left", "sleeve_right"],
            "notes": "Demo modu — Gemini API key tanımlı değil",
            "demo_mode": True,
        }

    try:
        with open(file_path, "rb") as f:
            image_data = f.read()

        ext = os.path.splitext(file_path)[1].lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
        mime_type = mime_map.get(ext, "image/jpeg")

        response = model.generate_content([
            CATEGORY_PROMPTS["visual_analysis"],
            {"mime_type": mime_type, "data": image_data},
        ])

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        return json.loads(text)
    except Exception as e:
        return {"error": str(e), "confidence": 0, "demo_mode": True}


async def validate_measurements(measurements: dict) -> dict[str, Any]:
    """Ölçü tablosunu doğrula"""
    model = _configure_gemini()
    if not model:
        return {"valid": True, "anomalies": [], "confidence": 0.85, "suggestions": [], "demo_mode": True}

    try:
        response = model.generate_content([
            CATEGORY_PROMPTS["measurement_validation"],
            json.dumps(measurements, ensure_ascii=False),
        ])
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except Exception as e:
        return {"valid": True, "anomalies": [], "confidence": 0, "error": str(e), "demo_mode": True}
