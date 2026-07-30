"""AI Analiz Servisi — Vertex AI Express Mode ile görsel analiz ve kalıp üretimi."""
import json
import logging
import os
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Awaitable

from app.core.config import settings
from app.services.calibration import calibrate_pattern_pieces

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types

    VERTEX_AVAILABLE = True
    logger.info("google-genai başarıyla import edildi")
except ImportError:
    VERTEX_AVAILABLE = False
    logger.warning("google-genai import BAŞARISIZ — pip install google-genai gerekli")


class ThinkingLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class MediaResolution(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class _VertexModel:
    client: Any
    model_name: str
    generation_config: Any

    def generate_content(self, content_parts: list[Any]) -> Any:
        contents = [
            types.Part.from_bytes(
                data=part["data"],
                mime_type=part["mime_type"],
            )
            if isinstance(part, dict) and {"data", "mime_type"} <= part.keys()
            else part
            for part in content_parts
        ]
        return self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=self.generation_config,
        )


def _configure_vertex(thinking_level: str | None = None, media_resolution: str | None = None):
    """Vertex AI Express Mode istemcisini API anahtarıyla yapılandır."""
    api_key = settings.VERTEX_API_KEY
    logger.info(
        "_configure_vertex: VERTEX_AVAILABLE=%s, API_KEY_SET=%s",
        VERTEX_AVAILABLE,
        bool(api_key),
    )

    if not VERTEX_AVAILABLE:
        logger.error("Vertex AI kullanılamıyor: google-genai paketi yüklenmemiş")
        return None

    if not api_key:
        logger.error("Vertex AI kullanılamıyor: VERTEX_API_KEY boş veya tanımsız")
        return None

    # Model parametreleri — config'den al
    model_name = settings.VERTEX_MODEL
    t_level = thinking_level or settings.VERTEX_THINKING_LEVEL
    m_resolution = media_resolution or settings.VERTEX_MEDIA_RESOLUTION

    # Generation config — standart ve en uyumlu parametreler
    generation_config = types.GenerateContentConfig(
        temperature=0.2,
        top_p=0.95,
        top_k=40,
    )

    # model_name ve parametrelerini logla
    logger.info(
        "Vertex AI Express Mode model hazırlanıyor: %s (thinking=%s, media_res=%s)",
        model_name,
        t_level,
        m_resolution,
    )
    client = genai.Client(vertexai=True, api_key=api_key)
    return _VertexModel(
        client=client,
        model_name=model_name,
        generation_config=generation_config,
    )

# Fallback model listesi — generate_content 404 verirse sırayla denenecek
FALLBACK_MODELS = [settings.VERTEX_FALLBACK_MODEL]


def _try_generate_with_fallback(primary_model, content_parts: list) -> Any:
    """İlk modelle dene, 404 hatası alınırsa fallback modelleri dene. Timing loglama dahil."""
    start_time = time.time()
    try:
        response = primary_model.generate_content(content_parts)
        elapsed = time.time() - start_time
        logger.info(f"✅ Birincil model başarılı — süre: {elapsed:.2f}s, yanıt: {len(response.text)} karakter")
        return response
    except Exception as e:
        elapsed = time.time() - start_time
        err_str = str(e)
        logger.warning(f"❌ Birincil model başarısız ({elapsed:.2f}s): {err_str[:150]}")
        if "404" in err_str or "no longer available" in err_str.lower() or "not found" in err_str.lower():
            for fallback_name in FALLBACK_MODELS:
                fb_start = time.time()
                try:
                    logger.info(f"🔄 Fallback model deneniyor: {fallback_name}")
                    fb_model = _VertexModel(
                        client=primary_model.client,
                        model_name=fallback_name,
                        generation_config=primary_model.generation_config,
                    )
                    response = fb_model.generate_content(content_parts)
                    fb_elapsed = time.time() - fb_start
                    logger.info(f"✅ Fallback {fallback_name} başarılı — süre: {fb_elapsed:.2f}s")
                    return response
                except Exception as fb_e:
                    fb_elapsed = time.time() - fb_start
                    logger.warning(f"❌ Fallback {fallback_name} başarısız ({fb_elapsed:.2f}s): {fb_e}")
                    continue
            total_elapsed = time.time() - start_time
            logger.error(f"🚫 Tüm modeller başarısız oldu — toplam süre: {total_elapsed:.2f}s")
            raise
        raise


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

REFERANS KALİBRASYONU (ÇOK ÖNEMLİ):
Görselde bir referans nesne (ör: A4 kağıdı, cetvel, kredi kartı/ID kartı veya madeni para) bulunuyorsa:
1. Bu nesneyi algıla ve onun piksel sınırlarından (bounding box veya en-boy oranı) yararlanarak görseldeki piksel başına kaç milimetre düştüğünü hesapla.
2. Bu oranı "pixel_to_mm_ratio" (mm / pixel) adında bir float alan olarak JSON çıktısına ekle (örn: 0.8524).
3. Tüm kalıp parça koordinatlarını (coords) bu orana göre milimetre (mm) cinsinden ölçekle.
4. Çıktıdaki "reference_object_detected" alanına algıladığın nesneyi ("a4"|"id_card"|"coin"|"ruler"|"none") yaz.
5. "reference_object_bbox" alanına nesnenin normalize edilmiş [ymin, xmin, ymax, xmax] koordinatlarını yaz (örn: [0.12, 0.45, 0.35, 0.58]).

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
  "reference_object_detected": "a4|id_card|coin|ruler|none",
  "reference_object_bbox": [ymin, xmin, ymax, xmax],
  "pixel_to_mm_ratio": 0.8524,
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


async def analyze_image(
    file_path: str,
    thinking_level: str | None = None,
    media_resolution: str | None = None
) -> dict[str, Any]:
    """Görsel dosyasını AI ile analiz et"""
    start_time = time.time()
    model = _configure_vertex(
        thinking_level=thinking_level or 'low',
        media_resolution=media_resolution or 'medium'
    )
    if not model:
        return _demo_analysis()

    try:
        image_data, mime_type = _read_image(file_path)
        response = _try_generate_with_fallback(model, [
            VISUAL_ANALYSIS_PROMPT,
            {"mime_type": mime_type, "data": image_data},
        ])
        result = _parse_json_response(response.text)
        elapsed = time.time() - start_time
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["_model_used"] = settings.VERTEX_MODEL
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        return {"error": str(e), "confidence": 0, "demo_mode": True, "_analysis_time_seconds": round(elapsed, 2)}


async def analyze_image_bytes(
    image_data: bytes,
    mime_type: str = "image/jpeg",
    progress_callback: Callable[[str, str], Awaitable[None]] | None = None,
    thinking_level: str | None = None,
    media_resolution: str | None = None
) -> dict[str, Any]:
    """Bytes verisinden AI ile analiz et (disk gerektirmez)"""
    start_time = time.time()
    logger.info(f"analyze_image_bytes çağrıldı: data_size={len(image_data)}, mime={mime_type}")
    if progress_callback:
        await progress_callback("analyzing", "Görsel analizi başlatılıyor...")
        
    model = _configure_vertex(
        thinking_level=thinking_level or 'low',
        media_resolution=media_resolution or 'medium'
    )
    if not model:
        logger.warning("analyze_image_bytes: model=None, demo analiz döndürülüyor")
        if progress_callback:
            await progress_callback("analyzing", "Gemini API anahtarı bulunamadı, demo analiz yükleniyor...")
        return _demo_analysis()

    try:
        logger.info("Gemini API generate_content çağrılıyor...")
        if progress_callback:
            await progress_callback("analyzing", "Yapay zeka görsel detaylarını, siluet ve detay parçalarını inceliyor...")
            
        response = _try_generate_with_fallback(model, [
            VISUAL_ANALYSIS_PROMPT,
            {"mime_type": mime_type, "data": image_data},
        ])
        elapsed = time.time() - start_time
        logger.info(f"Gemini yanıtı alındı: {len(response.text)} karakter — toplam süre: {elapsed:.2f}s")
        result = _parse_json_response(response.text)
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["_model_used"] = settings.VERTEX_MODEL
        logger.info(f"Analiz başarılı: category={result.get('category', 'N/A')} — {elapsed:.2f}s")
        
        if progress_callback:
            await progress_callback("completed", "Görsel analizi başarıyla tamamlandı!")
            
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"analyze_image_bytes hata ({elapsed:.2f}s): {e}", exc_info=True)
        if progress_callback:
            await progress_callback("completed", f"Demo moduna geçildi: {str(e)[:40]}...")
        result = _demo_analysis()
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["demo_mode"] = True
        return result


async def generate_pattern_from_bytes(
    image_data: bytes,
    mime_type: str = "image/jpeg",
    ref_object_type: str | None = None,
    ref_bbox: list[float] | None = None,
    image_width: int | None = None,
    image_height: int | None = None,
    custom_dims: tuple[float, float] | None = None,
    progress_callback: Callable[[str, str], Awaitable[None]] | None = None,
    thinking_level: str | None = None,
    media_resolution: str | None = None
) -> dict[str, Any]:
    """Bytes verisinden gerçek kalıp parçaları üret ve referans nesneyle kalibre et"""
    start_time = time.time()
    logger.info(f"generate_pattern_from_bytes çağrıldı: data_size={len(image_data)}, mime={mime_type}, ref_obj={ref_object_type}")
    if progress_callback:
        await progress_callback("analyzing", "Kalıp üretim süreci başlatıldı. AI modeli hazırlanıyor...")
        
    model = _configure_vertex(
        thinking_level=thinking_level or 'high',
        media_resolution=media_resolution or 'high'
    )
    if not model:
        logger.warning("generate_pattern_from_bytes: model=None, demo kalıp döndürülüyor")
        if progress_callback:
            await progress_callback("analyzing", "Gemini API anahtarı bulunamadı, demo kalıp şablonu yükleniyor...")
        return _demo_pattern()

    try:
        logger.info("Gemini API kalıp üretimi çağrılıyor (thinking=high)...")
        if progress_callback:
            await progress_callback("analyzing", "Yapay zeka modeli kalıp geometrisini ve anatomik parçaları hesaplıyor (thinking modu aktif)...")
            
        prompt = PATTERN_GENERATION_PROMPT
        if ref_object_type:
            prompt = f"{prompt}\n\nKULLANICI BİLGİSİ: Görseldeki referans nesne: '{ref_object_type}'. Lütfen bu nesneyi algılayıp piksel-mm kalibrasyonunu gerçekleştir."

        response = _try_generate_with_fallback(model, [
            prompt,
            {"mime_type": mime_type, "data": image_data},
        ])
        elapsed = time.time() - start_time
        logger.info(f"Gemini kalıp yanıtı alındı: {len(response.text)} karakter — {elapsed:.2f}s")
        
        if progress_callback:
            await progress_callback("calibration", "Yapay zeka yanıtı alındı. Referans nesne ve piksel-mm kalibrasyon süreci başlatılıyor...")
            
        result = _parse_json_response(response.text)

        if "pieces" in result:
            for piece_data in result["pieces"].values():
                if "coords" in piece_data and isinstance(piece_data["coords"], list):
                    piece_data["coords"] = [
                        tuple(p) if isinstance(p, list) else p
                        for p in piece_data["coords"]
                    ]
        
        # Kalibrasyonu uygula
        if ref_object_type or "pixel_to_mm_ratio" in result:
            if progress_callback:
                await progress_callback("calibration", f"Referans nesne '{ref_object_type or result.get('reference_object_detected')}' analiz ediliyor ve kalibrasyon uygulanıyor...")
            result = calibrate_pattern_pieces(
                result,
                ref_object_type or result.get("reference_object_detected"),
                ref_bbox or result.get("reference_object_bbox"),
                image_width,
                image_height,
                custom_dims
            )

        if progress_callback:
            await progress_callback("generation", "Kalıp parçaları optimize ediliyor, koordinatlar sıfır merkezli hizalanıyor ve dikiş payları ayarlanıyor...")
            
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["_model_used"] = settings.VERTEX_MODEL
        
        if progress_callback:
            await progress_callback("completed", "Kalıp üretimi başarıyla tamamlandı!")
            
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"generate_pattern_from_bytes hata ({elapsed:.2f}s): {e}", exc_info=True)
        if progress_callback:
            await progress_callback("generation", f"Hata oluştu. Demo kalıp yükleniyor: {str(e)[:40]}...")
        result = _demo_pattern()
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["demo_mode"] = True
        return result


async def generate_pattern_from_image(
    file_path: str,
    ref_object_type: str | None = None,
    ref_bbox: list[float] | None = None,
    image_width: int | None = None,
    image_height: int | None = None,
    custom_dims: tuple[float, float] | None = None,
    thinking_level: str | None = None,
    media_resolution: str | None = None
) -> dict[str, Any]:
    """Görsel dosyasından gerçek kalıp parçaları üret ve referans nesneyle kalibre et"""
    try:
        image_data, mime_type = _read_image(file_path)
        return await generate_pattern_from_bytes(
            image_data,
            mime_type,
            ref_object_type,
            ref_bbox,
            image_width,
            image_height,
            custom_dims,
            thinking_level=thinking_level,
            media_resolution=media_resolution
        )
    except Exception as e:
        return {"error": str(e), "demo_mode": True}


async def generate_pattern_with_analysis(
    file_path: str,
    analysis: dict,
    ref_object_type: str | None = None,
    ref_bbox: list[float] | None = None,
    image_width: int | None = None,
    image_height: int | None = None,
    custom_dims: tuple[float, float] | None = None,
    progress_callback: Callable[[str, str], Awaitable[None]] | None = None,
    thinking_level: str | None = None,
    media_resolution: str | None = None
) -> dict[str, Any]:
    """Analiz sonuçları + görselden kalıp üret ve referans nesneyle kalibre et"""
    start_time = time.time()
    if progress_callback:
        await progress_callback("analyzing", "Önceki analiz sonuçlarıyla kalıp üretimi başlatıldı. AI hazırlanıyor...")
        
    model = _configure_vertex(
        thinking_level=thinking_level or 'high',
        media_resolution=media_resolution or 'high'
    )
    if not model:
        if progress_callback:
            await progress_callback("analyzing", "Gemini API anahtarı bulunamadı, demo kalıp şablonu yükleniyor...")
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
        if ref_object_type:
            enhanced_prompt = f"{enhanced_prompt}\n\nKULLANICI BİLGİSİ: Görseldeki referans nesne: '{ref_object_type}'. Lütfen bu nesneyi algılayıp piksel-mm kalibrasyonunu gerçekleştir."

        if progress_callback:
            await progress_callback("analyzing", "Yapay zeka modeli görseli ve analiz sonuçlarını birleştirerek kalıp çıkarıyor (thinking aktif)...")
            
        response = _try_generate_with_fallback(model, [
            enhanced_prompt,
            {"mime_type": mime_type, "data": image_data},
        ])
        
        if progress_callback:
            await progress_callback("calibration", "Kalıp verisi alındı. Piksel-milimetre kalibrasyon süreci başlatılıyor...")
            
        result = _parse_json_response(response.text)

        if "pieces" in result:
            for piece_data in result["pieces"].values():
                if "coords" in piece_data and isinstance(piece_data["coords"], list):
                    piece_data["coords"] = [
                        tuple(p) if isinstance(p, list) else p
                        for p in piece_data["coords"]
                    ]

        # Kalibrasyonu uygula
        if ref_object_type or "pixel_to_mm_ratio" in result:
            if progress_callback:
                await progress_callback("calibration", f"Referans nesne '{ref_object_type or result.get('reference_object_detected')}' analiz ediliyor ve kalibrasyon uygulanıyor...")
            result = calibrate_pattern_pieces(
                result,
                ref_object_type or result.get("reference_object_detected"),
                ref_bbox or result.get("reference_object_bbox"),
                image_width,
                image_height,
                custom_dims
            )

        if progress_callback:
            await progress_callback("generation", "Kalıp parçaları optimize ediliyor, koordinatlar sıfır merkezli hizalanıyor ve dikiş payları ayarlanıyor...")
            
        elapsed = time.time() - start_time
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["_model_used"] = settings.VERTEX_MODEL
        
        if progress_callback:
            await progress_callback("completed", "Kalıp üretimi başarıyla tamamlandı!")
            
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        if progress_callback:
            await progress_callback("error", f"Kalıp üretimi sırasında hata oluştu: {str(e)}")
        return {"error": str(e), "demo_mode": True, "_analysis_time_seconds": round(elapsed, 2)}


async def validate_measurements(measurements: dict) -> dict[str, Any]:
    """Ölçü tablosunu doğrula"""
    start_time = time.time()
    model = _configure_vertex(thinking_level='medium')
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
        result = _parse_json_response(response.text)
        elapsed = time.time() - start_time
        result["_validation_time_seconds"] = round(elapsed, 2)
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        return {"valid": True, "anomalies": [], "confidence": 0, "error": str(e), "demo_mode": True, "_validation_time_seconds": round(elapsed, 2)}

# === Multimodal Destek Fonksiyonları ===


async def analyze_video_frames(video_path: str, max_frames: int = 5) -> dict[str, Any]:
    """Video dosyasından key frame'ler çıkararak kalıp analizi yap"""
    start_time = time.time()
    logger.info(f"analyze_video_frames çağrıldı: path={video_path}, max_frames={max_frames}")

    try:
        import cv2
    except ImportError:
        logger.warning("opencv-python yüklü değil — video analizi yapılamıyor")
        return {
            "error": "opencv-python paketi gerekli: pip install opencv-python",
            "demo_mode": True,
            "frames_extracted": 0,
        }

    model = _configure_vertex(thinking_level='high', media_resolution='high')
    if not model:
        return {"error": "Gemini model oluşturulamadı", "demo_mode": True}

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": f"Video açılamadı: {video_path}", "demo_mode": True}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        duration = total_frames / fps

        # Eşit aralıklarla frame seç
        frame_indices = [int(i * total_frames / max_frames) for i in range(max_frames)]
        extracted_frames = []

        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                extracted_frames.append(buffer.tobytes())

        cap.release()
        logger.info(f"Video'dan {len(extracted_frames)} frame çıkarıldı (toplam: {total_frames} frame, {duration:.1f}s)")

        if not extracted_frames:
            return {"error": "Video'dan frame çıkarılamadı", "demo_mode": True}

        # Her frame'i analiz et
        frame_analyses = []
        for i, frame_data in enumerate(extracted_frames):
            frame_prompt = f"""Bu giysi görselini analiz et (video frame {i + 1}/{len(extracted_frames)}).
{VISUAL_ANALYSIS_PROMPT}"""
            response = _try_generate_with_fallback(model, [
                frame_prompt,
                {"mime_type": "image/jpeg", "data": frame_data},
            ])
            frame_result = _parse_json_response(response.text)
            frame_analyses.append(frame_result)

        # Frame analizlerini birleştir — en yüksek confidence'lı olanı ana sonuç yap
        best_analysis = max(frame_analyses, key=lambda x: x.get('confidence', 0))
        elapsed = time.time() - start_time

        return {
            "combined_analysis": best_analysis,
            "frame_count": len(extracted_frames),
            "video_duration_seconds": round(duration, 1),
            "individual_frames": frame_analyses,
            "_analysis_time_seconds": round(elapsed, 2),
            "_model_used": settings.VERTEX_MODEL,
        }
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Video analizi hatası ({elapsed:.2f}s): {e}", exc_info=True)
        return {"error": str(e), "demo_mode": True, "_analysis_time_seconds": round(elapsed, 2)}


async def analyze_3d_to_2d_pattern(model_image_path: str) -> dict[str, Any]:
    """3D model görselleştirmesinden 2D kalıp dönüşüm taslağı oluştur"""
    start_time = time.time()
    logger.info(f"analyze_3d_to_2d_pattern çağrıldı: path={model_image_path}")

    model = _configure_vertex(thinking_level='high', media_resolution='high')
    if not model:
        return {"error": "Gemini model oluşturulamadı", "demo_mode": True}

    try:
        image_data, mime_type = _read_image(model_image_path)

        prompt_3d_to_2d = """Sen uzman bir konfeksiyon mühendisisin. Bu 3D giysi modeli/görselleştirmesini analiz et
ve 2D kalıp parçalarına dönüştürme taslağı oluştur.

3D'den 2D'ye dönüşüm kuralları:
1. 3D yüzeyleri düzleştirerek 2D kalıp parçaları belirle
2. Dikiş hatlarını (seam lines) tespit et — bu hatlar 2D parça sınırlarını oluşturur
3. Kumaş esnekliği/döküm yönünü belirle (grain direction)
4. Daraltma (dart) ve kup (godet) ihtiyaçlarını tespit et
5. Her parça için tahmini boyutları mm cinsinden belirt

JSON formatında döndür:
{
    "source_type": "3d_model",
    "garment_type": "Giysi tipi açıklaması",
    "conversion_notes": "3D→2D dönüşüm notları",
    "surface_analysis": {
        "total_surfaces": 0,
        "curved_surfaces": 0,
        "flat_surfaces": 0,
        "dart_requirements": ["açıklama"]
    },
    "estimated_pieces": [
        {
            "name": "Parça adı",
            "description": "3D yüzeyden nasıl düzleştirildiği",
            "estimated_width_mm": 0,
            "estimated_height_mm": 0,
            "grain_direction": "vertical|horizontal|bias",
            "needs_dart": true,
            "needs_ease": true,
            "complexity": "simple|moderate|complex"
        }
    ],
    "assembly_strategy": "Montaj stratejisi",
    "confidence": 0.85
}
Sadece JSON döndür."""

        response = _try_generate_with_fallback(model, [
            prompt_3d_to_2d,
            {"mime_type": mime_type, "data": image_data},
        ])
        result = _parse_json_response(response.text)
        elapsed = time.time() - start_time
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["_model_used"] = settings.VERTEX_MODEL
        logger.info(f"3D→2D analiz tamamlandı — {elapsed:.2f}s")
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"3D→2D analiz hatası ({elapsed:.2f}s): {e}", exc_info=True)
        return {"error": str(e), "demo_mode": True, "_analysis_time_seconds": round(elapsed, 2)}


async def analyze_multi_view(
    images: list[tuple[bytes, str]],
    view_labels: list[str] | None = None,
) -> dict[str, Any]:
    """Çoklu görsel analizi — ön, arka, yan görünümleri birleştirerek analiz et"""
    start_time = time.time()
    logger.info(f"analyze_multi_view çağrıldı: {len(images)} görsel")

    if not images:
        return {"error": "En az bir görsel gerekli", "demo_mode": True}

    model = _configure_vertex(thinking_level='high', media_resolution='high')
    if not model:
        return {"error": "Gemini model oluşturulamadı", "demo_mode": True}

    labels = view_labels or [f"Görünüm {i + 1}" for i in range(len(images))]

    try:
        view_descriptions = "\n".join([
            f"- Görsel {i + 1}: {labels[i] if i < len(labels) else f'Görünüm {i + 1}'}"
            for i in range(len(images))
        ])

        multi_view_prompt = f"""Sen uzman bir konfeksiyon mühendisisin. Aynı giysinin birden fazla açıdan
çekilmiş görsellerini birlikte analiz et.

GÖRSELLER:
{view_descriptions}

GÖREV:
1. Tüm görüşleri birlikte değerlendirerek tek bir kapsamlı analiz oluştur
2. Tek görünümde görünmeyen detayları (arka fermuar, yan cep vs.) diğer açılardan tespit et
3. 360° analiz yaparak daha doğru kalıp parçası tahmini ver
4. Her görünümden elde edilen benzersiz bilgileri birleştir

{VISUAL_ANALYSIS_PROMPT}

EK ALANLAR (JSON'a ekle):
"multi_view_analysis": true,
"views_analyzed": {len(images)},
"view_contributions": [
    {{"view": "Ön", "unique_details": ["..."]}},
    {{"view": "Arka", "unique_details": ["..."]}}
],
"combined_confidence": 0.0-1.0

Sadece JSON döndür."""

        content_parts: list[Any] = [multi_view_prompt]
        for img_data, img_mime in images:
            content_parts.append({"mime_type": img_mime, "data": img_data})

        response = _try_generate_with_fallback(model, content_parts)
        result = _parse_json_response(response.text)
        elapsed = time.time() - start_time
        result["_analysis_time_seconds"] = round(elapsed, 2)
        result["_model_used"] = settings.VERTEX_MODEL
        result["_views_count"] = len(images)
        logger.info(f"Multi-view analiz tamamlandı — {len(images)} görsel, {elapsed:.2f}s")
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Multi-view analiz hatası ({elapsed:.2f}s): {e}", exc_info=True)
        return {"error": str(e), "demo_mode": True, "_analysis_time_seconds": round(elapsed, 2)}


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
        "notes": "VERTEX_API_KEY ortam değişkeni tanımlayın",
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
                "notes": "Demo parça — gerçek kalıp üretimi için VERTEX_API_KEY gerekli",
                "measurements": {
                    "width": 280,
                    "height": 720,
                    "shoulder_width": 150,
                    "armhole_depth": 220,
                    "waist_width": 230,
                    "hem_width": 280
                },
                "notches": [
                    {"position": (140, 45), "label": "Omuz noktası"},
                    {"position": (0, 350), "label": "Bel noktası"}
                ],
                "darts": [
                    {"position": (140, 350), "width": 25, "depth": 100, "type": "bel pensi"}
                ]
            },
            "arka_beden": {
                "coords": [(0,0),(0,710),(50,730),(230,730),(280,710),(280,0),(240,-22),(180,-35),(100,-35),(40,-22),(0,0)],
                "grain_direction": "vertical",
                "quantity": 1,
                "notes": "Demo parça",
                "measurements": {
                    "width": 280,
                    "height": 730,
                    "shoulder_width": 140,
                    "armhole_depth": 210,
                    "waist_width": 220,
                    "hem_width": 280
                },
                "notches": [
                    {"position": (140, 35), "label": "Omuz noktası"},
                    {"position": (0, 360), "label": "Bel noktası"}
                ],
                "darts": []
            },
        },
        "total_piece_count": 2,
        "assembly_order": ["1. Pensler dikilir", "2. Omuz dikişleri kapatılır", "3. Yan dikişler birleştirilir"],
        "demo_mode": True,
    }
