"""Referans nesneler kullanarak kalıp koordinat kalibrasyonu modülü"""
import logging
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)

# Standart nesnelerin milimetre cinsinden gerçek boyutları (Genişlik, Yükseklik)
STANDARD_OBJECTS: Dict[str, Tuple[float, float]] = {
    "a4": (210.0, 297.0),
    "id_card": (85.6, 53.98),
    "coin": (26.15, 26.15),
    "ruler_30cm": (300.0, 30.0),
}


def get_reference_dimensions(object_type: str, custom_dims: Tuple[float, float] | None = None) -> Tuple[float, float] | None:
    """Belirtilen nesne tipine göre gerçek dünya boyutlarını döndürür (mm)"""
    if not object_type:
        return None
    
    obj_key = object_type.lower().strip()
    if obj_key == "custom" and custom_dims:
        return custom_dims
        
    return STANDARD_OBJECTS.get(obj_key)


def calculate_scale_ratio(
    ref_real_width_mm: float,
    ref_pixel_width: float,
    ref_real_height_mm: float | None = None,
    ref_pixel_height: float | None = None
) -> float:
    """Piksel başına düşen milimetre oranını (mm / pixel) hesaplar"""
    if ref_pixel_width <= 0:
        return 1.0
        
    width_ratio = ref_real_width_mm / ref_pixel_width
    
    # Eğer yükseklik de verilmişse her iki eksenin ortalamasını alarak doğruluğu artır
    if ref_real_height_mm is not None and ref_pixel_height is not None and ref_pixel_height > 0:
        height_ratio = ref_real_height_mm / ref_pixel_height
        return (width_ratio + height_ratio) / 2.0
        
    return width_ratio


def scale_coordinates(
    coords: List[Tuple[float, float]],
    scale_ratio: float,
    center_at_zero: bool = True
) -> List[Tuple[float, float]]:
    """Koordinat listesini verilen ölçek oranıyla çarparak kalibre eder"""
    if not coords or scale_ratio <= 0 or scale_ratio == 1.0:
        return coords
        
    scaled = [(round(x * scale_ratio, 2), round(y * scale_ratio, 2)) for x, y in coords]
    
    # Kalıbın sol alt köşesini (0,0) noktasına hizala (normalizasyon)
    if center_at_zero and scaled:
        min_x = min(p[0] for p in scaled)
        min_y = min(p[1] for p in scaled)
        scaled = [(round(x - min_x, 2), round(y - min_y, 2)) for x, y in scaled]
        
    return scaled


def calibrate_pattern_pieces(
    pattern_data: Dict[str, Any],
    ref_object_type: str,
    ref_bbox: List[float] | None = None,  # [ymin, xmin, ymax, xmax] normalize edilmiş veya piksel sınırları
    image_width: int | None = None,
    image_height: int | None = None,
    custom_dims: Tuple[float, float] | None = None
) -> Dict[str, Any]:
    """Kalıp parçalarının koordinatlarını referans nesneye göre tam ölçekler"""
    if "pieces" not in pattern_data:
        return pattern_data
        
    ref_dims = get_reference_dimensions(ref_object_type, custom_dims)
    if not ref_dims:
        logger.info(f"Kalibrasyon atlandı: '{ref_object_type}' için geçerli boyut bulunamadı.")
        return pattern_data
        
    ref_w_mm, ref_h_mm = ref_dims
    scale_ratio = 1.0
    
    # 1. Eğer bbox ve resim boyutları verilmişse orantısal piksel hesabı yap
    if ref_bbox and len(ref_bbox) == 4 and image_width and image_height:
        # Bbox değerleri normalize edilmişse [0.0 - 1.0] piksel değerlerine çevir
        is_normalized = all(0.0 <= v <= 1.0 for v in ref_bbox)
        if is_normalized:
            ymin, xmin, ymax, xmax = ref_bbox
            pixel_w = (xmax - xmin) * image_width
            pixel_h = (ymax - ymin) * image_height
        else:
            ymin, xmin, ymax, xmax = ref_bbox
            pixel_w = abs(xmax - xmin)
            pixel_h = abs(ymax - ymin)
            
        scale_ratio = calculate_scale_ratio(ref_w_mm, pixel_w, ref_h_mm, pixel_h)
        logger.info(f"Kalibrasyon hesaplandı: pixel_w={pixel_w:.1f}, pixel_h={pixel_h:.1f} -> ratio={scale_ratio:.6f} mm/px")
    
    # 2. Eğer bbox yoksa ama Gemini modelinden direkt gelen bir mm/px oranı varsa onu kullan
    elif "pixel_to_mm_ratio" in pattern_data:
        try:
            scale_ratio = float(pattern_data["pixel_to_mm_ratio"])
            logger.info(f"Gemini'den gelen pixel_to_mm_ratio kullanılıyor: {scale_ratio:.6f}")
        except (ValueError, TypeError):
            pass
            
    if scale_ratio == 1.0 or scale_ratio <= 0:
        return pattern_data
        
    # Her bir kalıp parçasını ölçekle
    calibrated_pieces = {}
    for name, piece in pattern_data["pieces"].items():
        if "coords" in piece:
            piece_copy = dict(piece)
            original_coords = piece["coords"]
            
            # Koordinatları ölçekle
            scaled_coords = scale_coordinates(original_coords, scale_ratio)
            piece_copy["coords"] = scaled_coords
            
            # Genişlik ve yükseklik ölçülerini de güncelle (measurements)
            if "measurements" in piece_copy and isinstance(piece_copy["measurements"], dict):
                measurements = dict(piece_copy["measurements"])
                for m_key in ["width", "height", "shoulder_width", "armhole_depth", "waist_width", "hem_width"]:
                    if m_key in measurements:
                        try:
                            measurements[m_key] = round(float(measurements[m_key]) * scale_ratio, 1)
                        except (ValueError, TypeError):
                            pass
                piece_copy["measurements"] = measurements
                
            calibrated_pieces[name] = piece_copy
        else:
            calibrated_pieces[name] = piece
            
    pattern_data["pieces"] = calibrated_pieces
    pattern_data["calibration_applied"] = True
    pattern_data["scale_ratio_mm_per_pixel"] = round(scale_ratio, 6)
    
    return pattern_data
