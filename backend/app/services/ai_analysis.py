"""AI Analiz Servisi — Gemini API ile görsel analiz ve kalıp üretimi"""
import json
import logging
import os
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    logger.info("google.generativeai başarıyla import edildi")
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google.generativeai import BAŞARISIZ — pip install google-generativeai gerekli")


def _configure_gemini():
    api_key = settings.GEMINI_API_KEY
    logger.info(f"_configure_gemini: GEMINI_AVAILABLE={GEMINI_AVAILABLE}, API_KEY_SET={bool(api_key)}, KEY_LEN={len(api_key) if api_key else 0}")

    if not GEMINI_AVAILABLE:
        logger.error("Gemini kullanılamıyor: google.generativeai paketi yüklenmemiş")
        return None

    if not api_key:
        logger.error("Gemini kullanılamıyor: GEMINI_API_KEY boş veya tanımsız")
        # Env'den doğrudan kontrol
        env_key = os.environ.get("GEMINI_API_KEY", "")
        logger.info(f"os.environ GEMINI_API_KEY: set={bool(env_key)}, len={len(env_key)}")
        if env_key:
            logger.info("os.environ'dan GEMINI_API_KEY bulundu, settings'de yok — env_key kullanılıyor")
            api_key = env_key
        else:
            return None

    genai.configure(api_key=api_key)

    # Varsayılan model — kullanıcı talimatı: önce flash, olmazsa pro
    model_name = "gemini-3.1-flash-image-preview"
    logger.info(f"Gemini model oluşturuluyor: {model_name}")
    return genai.GenerativeModel(model_name)


# Fallback model listesi — generate_content 404 verirse denenecek
FALLBACK_MODELS = ["gemini-3.1-pro-preview"]


def _try_generate_with_fallback(primary_model, content_parts: list) -> Any:
    """İlk modelle dene, 404 hatası alınırsa fallback modelleri dene"""
    try:
        response = primary_model.generate_content(content_parts)
        return response
    except Exception as e:
        err_str = str(e)
        if "404" in err_str or "no longer available" in err_str.lower():
            logger.warning(f"Birincil model başarısız: {err_str[:100]}. Fallback deneniyor...")
            for fallback_name in FALLBACK_MODELS:
                try:
                    logger.info(f"Fallback model deneniyor: {fallback_name}")
                    fb_model = genai.GenerativeModel(fallback_name)
                    response = fb_model.generate_content(content_parts)
                    logger.info(f"Fallback model {fallback_name} başarılı!")
                    return response
                except Exception as fb_e:
                    logger.warning(f"Fallback {fallback_name} de başarısız: {fb_e}")
                    continue
            raise  # Hiçbir model çalışmadıysa orijinal hatayı fırlat
        raise  # 404 dışı hatalar için


VISUAL_ANALYSIS_PROMPT = """Sen uzman bir konfeksiyon mühendisisin ve profesyonel kalıp ustasısın (pattern maker).
Bu giysi görselini çok dikkatli analiz et.

ÖNEMLİ: Görselde birden fazla giysi parçası (ör: ayrı bir etek, üst, mont) varsa her birini "detected_garments" listesinde ayrı ayrı tanımla.

Aşağıdaki bilgileri JSON formatında çıkar:
{
  "detected_garments": [
    {
      "garment_id": 1,
      "category": "tshirt|shirt|dress|skirt|pants|outerwear|jacket|blouse|coat|vest|shorts",
      "garment_type": "kısa açıklama (ör: A-line midi elbise, slim fit gömlek)",
      "confidence": 0.0-1.0,
      "silhouette": "slim|regular|oversize|a-line|fitted|flared|straight",
      "collar_type": "round|v-neck|button-down|stand|peter-pan|shawl|none",
      "sleeve_type": "short|3quarter|long|sleeveless|puff|raglan|bell",
      "closure_type": "none|front-button|back-zipper|side-zipper|pullover",
      "waist_type": "natural|empire|drop|none",
      "hem_type": "straight|curved|asymmetric|flared",
      "length": "crop|waist|hip|knee|midi|maxi",
      "details": ["pocket", "zipper", "button", "dart", "pleat", "ruffle", "collar_stand", "cuff"],
      "estimated_pieces": ["on_beden", "arka_beden", "kol", "yaka", ...],
      "fabric_suggestion": "Önerilen kumaş tipi"
    }
  ],
  "multi_garment": true/false,
  "total_garment_count": 1,
  "construction_notes": "Genel dikiş ve montaj notları",
  "category": "ilk giysi kategorisi (geriye uyumluluk)",
  "confidence": 0.0-1.0,
  "garment_type": "ilk giysi açıklaması",
  "silhouette": "ilk giysi silueti",
  "collar_type": "ilk giysi yakası",
  "sleeve_type": "ilk giysi kolu",
  "details": [],
  "estimated_pieces": []
}

Eğer görselde birden fazla farklı giysi varsa multi_garment=true yap ve detected_garments listesinde her birini ayrı tanımla.
Sadece JSON döndür, başka bir şey yazma."""

PATTERN_GENERATION_PROMPT = """Sen dünya çapında deneyimli bir kalıp ustasısın. 71 ADET profesyonel kalıp çizimini inceleyerek öğrendiğin kurallara göre GERÇEKÇİ konfeksiyon kalıp parçaları oluştur.

MUTLAK KURALLAR:
1. Koordinatlar mm cinsindendir. Beden M (42 EU) için oluştur.
2. PARÇALAR DİKDÖRTGEN OLMAMALI! Her parçanın kendi anatomik şekli vardır:
   - Ön beden: Yaka evi → eğri, omuz → eğimli, kol evi → S-eğrisi, yan dikiş → kavisli
   - Kol: Kol tepesi → belirgin yuvarlak kavis (8-12 ara nokta), alt → daralan
   - Yaka: Oval/kavisli kenarlar, asla düz dikdörtgen değil
   - Pantolon: Ağ eğrisi → J-şekli, bel hattı → kavisli
3. Her parçada en az 12-20 koordinat noktası olmalı (eğri kısımlar birçok ara noktadan geçmeli).
4. Her parçanın tüm ölçülerini mm olarak belirt (measurements alanında).
5. Pensler, notch noktaları ve kumaş yönü belirt.
6. Dikiş payı DAHİL DEĞİL — net kalıp çizgileri.
7. Koordinatlar saat yönünde, kapalı kontür (ilk=son nokta).
8. Parça isimleri Türkçe.

REFERANS ÖLÇÜLER (M Beden — mm):
Üst giysi: Omuz=150, Yarım göğüs=260, Yarım bel=230, Kol evi derinliği=220, Beden boyu=700, Yaka geniş=70, Yaka derin ön=120, Yaka derin arka=30
Kol: Tepesi yükseklik=150, Uzunluk=600, Genişlik=180, Bilek=120
Pantolon: Yarım bel=210, Yarım kalça=270, Ağ derinliği=280, Boy=1050, Paça=230
Etek: Yarım bel=200, Yarım kalça=260, Boy=650

GÖMLEK İÇİN ÖN BEDEN KOORDİNAT ÖRNEĞİ:
[[0,0],[30,-5],[65,-15],[80,0],[100,15],[140,45],[155,50],[160,80],[155,130],[160,180],[170,210],[240,210],[235,280],[230,350],[235,420],[240,500],[250,600],[260,680],[0,680],[0,0]]

GÖMLEK İÇİN KOL KOORDİNAT ÖRNEĞİ:
[[0,150],[15,100],[30,60],[50,25],[70,8],[90,0],[110,8],[130,25],[150,60],[165,100],[180,150],[170,300],[165,450],[160,580],[155,600],[25,600],[20,580],[15,450],[10,300],[0,150]]

GİYSİ TİPİNE GÖRE PARÇA LİSTESİ:
- Gömlek: on_beden(2×), arka_beden(1×), kol(2×), yaka(2×), manset(2×), cep(1×) = 10-14 parça
- Elbise: on_beden(2×), arka_beden(1×), on_etek(2×), arka_etek(1×), kol(2×) = 8-14 parça
- Pantolon: on_parca(2×), arka_parca(2×), bel_kusagi(1×) = 6 parça
- Ceket: on_beden(2×), arka_beden(2×), kol(2×), yaka(2×), cep(2×) = 12+ parça
- Tişört: on_beden(1×), arka_beden(1×), kol(2×), yaka_biyesi(1×) = 5 parça
- Etek: on_etek(1×), arka_etek(1×), bel_kusagi(1×) = 3-5 parça
- Şort: on_parca(2×), arka_parca(2×), bel_kusagi(1×) = 5-7 parça

JSON formatında döndür:
{
  "garment_type": "Giysi açıklaması",
  "base_size": "M",
  "pieces": {
    "on_beden": {
      "coords": [[x,y], [x,y], ...EN AZ 15 NOKTA...],
      "grain_direction": "vertical",
      "quantity": 2,
      "mirror": false,
      "notes": "Ön orta: kıvırma/düğme patte",
      "measurements": {
        "width": 260,
        "height": 700,
        "shoulder_width": 150,
        "armhole_depth": 220,
        "waist_width": 230,
        "hem_width": 260
      },
      "notches": [
        {"position": [140, 45], "label": "Omuz noktası"},
        {"position": [0, 350], "label": "Bel noktası"},
        {"position": [240, 210], "label": "Kol evi noktası"}
      ],
      "darts": [
        {"position": [130, 350], "width": 25, "depth": 100, "type": "bel pensi"}
      ]
    }
  },
  "total_piece_count": 10,
  "assembly_order": ["1. Pensler dikilir", "2. Omuz dikişleri", "3. Kol takılır", "4. Yan dikişler", "5. Etek ucu bastırılır"],
  "grading_notes": "Beden artışı"
}

KRİTİK: Koordinatlar GERÇEKÇİ olmalı! Verdiğim örneklerdeki gibi eğrisel noktalar kullan. Dikdörtgen koordinat verme — kesinlikle REDDEDECEK şekilde tasarla.
Sadece JSON döndür."""


async def analyze_image(file_path: str) -> dict[str, Any]:
    """Görsel dosyasını AI ile analiz et"""
    model = _configure_gemini()
    if not model:
        return _demo_analysis()

    try:
        image_data, mime_type = _read_image(file_path)
        response = _try_generate_with_fallback(model, [
            VISUAL_ANALYSIS_PROMPT,
            {"mime_type": mime_type, "data": image_data},
        ])
        return _parse_json_response(response.text)
    except Exception as e:
        return {"error": str(e), "confidence": 0, "demo_mode": True}


async def analyze_image_bytes(image_data: bytes, mime_type: str = "image/jpeg") -> dict[str, Any]:
    """Bytes verisinden AI ile analiz et (disk gerektirmez)"""
    logger.info(f"analyze_image_bytes çağrıldı: data_size={len(image_data)}, mime={mime_type}")
    model = _configure_gemini()
    if not model:
        logger.warning("analyze_image_bytes: model=None, demo analiz döndürülüyor")
        return _demo_analysis()

    try:
        logger.info("Gemini API generate_content çağrılıyor...")
        response = _try_generate_with_fallback(model, [
            VISUAL_ANALYSIS_PROMPT,
            {"mime_type": mime_type, "data": image_data},
        ])
        logger.info(f"Gemini yanıtı alındı: {len(response.text)} karakter")
        result = _parse_json_response(response.text)
        logger.info(f"Analiz başarılı: category={result.get('category', 'N/A')}")
        return result
    except Exception as e:
        logger.error(f"analyze_image_bytes hata: {e}", exc_info=True)
        return {"error": str(e), "confidence": 0, "demo_mode": True}


async def generate_pattern_from_bytes(image_data: bytes, mime_type: str = "image/jpeg") -> dict[str, Any]:
    """Bytes verisinden gerçek kalıp parçaları üret (disk gerektirmez)"""
    logger.info(f"generate_pattern_from_bytes çağrıldı: data_size={len(image_data)}, mime={mime_type}")
    model = _configure_gemini()
    if not model:
        logger.warning("generate_pattern_from_bytes: model=None, demo kalıp döndürülüyor")
        return _demo_pattern()

    try:
        logger.info("Gemini API kalıp üretimi çağrılıyor...")
        response = _try_generate_with_fallback(model, [
            PATTERN_GENERATION_PROMPT,
            {"mime_type": mime_type, "data": image_data},
        ])
        logger.info(f"Gemini kalıp yanıtı alındı: {len(response.text)} karakter")
        result = _parse_json_response(response.text)

        if "pieces" in result:
            for piece_data in result["pieces"].values():
                if "coords" in piece_data and isinstance(piece_data["coords"], list):
                    piece_data["coords"] = [
                        tuple(p) if isinstance(p, list) else p
                        for p in piece_data["coords"]
                    ]
        return result
    except Exception as e:
        return {"error": str(e), "demo_mode": True}


async def generate_pattern_from_image(file_path: str) -> dict[str, Any]:
    """Görsel dosyasından gerçek kalıp parçaları üret"""
    model = _configure_gemini()
    if not model:
        return _demo_pattern()

    try:
        image_data, mime_type = _read_image(file_path)
        response = _try_generate_with_fallback(model, [
            PATTERN_GENERATION_PROMPT,
            {"mime_type": mime_type, "data": image_data},
        ])
        result = _parse_json_response(response.text)

        # Koordinatları tuple listesine dönüştür
        if "pieces" in result:
            for piece_name, piece_data in result["pieces"].items():
                if "coords" in piece_data and isinstance(piece_data["coords"], list):
                    piece_data["coords"] = [
                        tuple(p) if isinstance(p, list) else p
                        for p in piece_data["coords"]
                    ]
        return result
    except Exception as e:
        return {"error": str(e), "demo_mode": True}


async def generate_pattern_with_analysis(
    file_path: str, analysis: dict
) -> dict[str, Any]:
    """Analiz sonuçları + görselden kalıp üret (daha doğru sonuç)"""
    model = _configure_gemini()
    if not model:
        return _demo_pattern()

    try:
        image_data, mime_type = _read_image(file_path)

        enhanced_prompt = f"""{PATTERN_GENERATION_PROMPT}

ÖNCEKİ ANALİZ SONUÇLARI (bu bilgileri de dikkate al):
- Kategori: {analysis.get('category', 'bilinmiyor')}
- Giysi Tipi: {analysis.get('garment_type', 'bilinmiyor')}
- Siluet: {analysis.get('silhouette', 'regular')}
- Yaka: {analysis.get('collar_type', 'round')}
- Kol: {analysis.get('sleeve_type', 'short')}
- Kapatma: {analysis.get('closure_type', 'none')}
- Bel: {analysis.get('waist_type', 'none')}
- Etek: {analysis.get('hem_type', 'straight')}
- Boy: {analysis.get('length', 'knee')}
- Detaylar: {', '.join(analysis.get('details', []))}
- Tahmini Parçalar: {', '.join(analysis.get('estimated_pieces', []))}
"""
        response = _try_generate_with_fallback(model, [
            enhanced_prompt,
            {"mime_type": mime_type, "data": image_data},
        ])
        result = _parse_json_response(response.text)

        if "pieces" in result:
            for piece_data in result["pieces"].values():
                if "coords" in piece_data and isinstance(piece_data["coords"], list):
                    piece_data["coords"] = [
                        tuple(p) if isinstance(p, list) else p
                        for p in piece_data["coords"]
                    ]
        return result
    except Exception as e:
        return {"error": str(e), "demo_mode": True}


async def validate_measurements(measurements: dict) -> dict[str, Any]:
    """Ölçü tablosunu doğrula"""
    model = _configure_gemini()
    if not model:
        return {"valid": True, "anomalies": [], "confidence": 0.85, "suggestions": [], "demo_mode": True}

    try:
        prompt = """Verilen ölçü tablosu değerlerini analiz et:
1. Ölçüler arasında tutarsızlık var mı?
2. Normal insan vücudu ölçüleriyle uyumlu mu?
3. Beden aralıkları arasında orantısal artış var mı?
JSON formatında:
{"valid": true/false, "anomalies": [{"measurement": "...", "issue": "..."}], "confidence": 0.0-1.0, "suggestions": ["..."]}"""
        response = _try_generate_with_fallback(model, [prompt, json.dumps(measurements, ensure_ascii=False)])
        return _parse_json_response(response.text)
    except Exception as e:
        return {"valid": True, "anomalies": [], "confidence": 0, "error": str(e), "demo_mode": True}


# === Yardımcı Fonksiyonlar ===

def _read_image(file_path: str) -> tuple[bytes, str]:
    """Resim dosyasını oku ve MIME tipini belirle"""
    with open(file_path, "rb") as f:
        image_data = f.read()
    ext = os.path.splitext(file_path)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    return image_data, mime_map.get(ext, "image/jpeg")


def _parse_json_response(text: str) -> dict:
    """Gemini yanıtından JSON ayıkla"""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)


def _demo_analysis() -> dict[str, Any]:
    """Demo modu analiz verisi"""
    return {
        "category": "dress",
        "confidence": 0.0,
        "garment_type": "Demo — Gemini API key tanımlı değil",
        "silhouette": "regular",
        "collar_type": "round",
        "sleeve_type": "short",
        "details": [],
        "estimated_pieces": ["front_body", "back_body", "sleeve"],
        "notes": "GEMINI_API_KEY ortam değişkeni tanımlayın",
        "demo_mode": True,
    }


def _demo_pattern() -> dict[str, Any]:
    """Demo modu kalıp verisi"""
    return {
        "garment_type": "Demo Kalıp — Gemini API key tanımlı değil",
        "base_size": "M",
        "pieces": {
            "on_beden": {
                "coords": [(0,0),(0,700),(50,720),(230,720),(280,700),(280,0),(240,-28),(180,-45),(100,-45),(40,-28),(0,0)],
                "grain_direction": "vertical",
                "quantity": 1,
                "notes": "Demo parça — gerçek kalıp üretimi için GEMINI_API_KEY gerekli"
            },
            "arka_beden": {
                "coords": [(0,0),(0,710),(50,730),(230,730),(280,710),(280,0),(240,-22),(180,-35),(100,-35),(40,-22),(0,0)],
                "grain_direction": "vertical",
                "quantity": 1,
                "notes": "Demo parça"
            },
        },
        "total_piece_count": 2,
        "assembly_order": ["Demo modu"],
        "demo_mode": True,
    }
