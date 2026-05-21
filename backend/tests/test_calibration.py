import sys
import os

# Backend dizinini python yoluna ekle
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.calibration import (
    get_reference_dimensions,
    calculate_scale_ratio,
    scale_coordinates,
    calibrate_pattern_pieces
)


def test_get_reference_dimensions():
    # Standart nesne boyutları doğrulaması
    a4_dims = get_reference_dimensions("a4")
    assert a4_dims == (210.0, 297.0)
    
    card_dims = get_reference_dimensions("id_card")
    assert card_dims == (85.6, 53.98)
    
    # Büyük/küçük harf duyarlılığı
    coin_dims = get_reference_dimensions("  CoIN  ")
    assert coin_dims == (26.15, 26.15)
    
    # Custom boyutlar
    custom_dims = get_reference_dimensions("custom", (100.0, 100.0))
    assert custom_dims == (100.0, 100.0)


def test_calculate_scale_ratio():
    # Sadece genişlik ile
    ratio1 = calculate_scale_ratio(210.0, 1000.0)
    assert ratio1 == 0.21
    
    # Genişlik ve yükseklik ortalaması ile
    # 210mm / 1000px = 0.21
    # 297mm / 1500px = 0.198
    # Ortalama = (0.21 + 0.198) / 2 = 0.204
    ratio2 = calculate_scale_ratio(210.0, 1000.0, 297.0, 1500.0)
    assert abs(ratio2 - 0.204) < 1e-5


def test_scale_coordinates():
    # 0.5 ölçekleme ve normalizasyon
    coords = [(10, 20), (30, 40), (50, 60)]
    scaled = scale_coordinates(coords, 0.5, center_at_zero=True)
    # Ölçeklenenler: (5, 10), (15, 20), (25, 30)
    # Normalize (sol alt köşeyi sıfıra çek): (0, 0), (10, 10), (20, 20)
    assert scaled == [(0.0, 0.0), (10.0, 10.0), (20.0, 20.0)]


def test_calibrate_pattern_pieces():
    pattern = {
        "garment_type": "T-Shirt",
        "pieces": {
            "on_beden": {
                "coords": [(100.0, 100.0), (200.0, 100.0), (200.0, 300.0), (100.0, 100.0)],
                "measurements": {
                    "width": 100.0,
                    "height": 200.0
                }
            }
        }
    }
    
    # Kalibrasyon uygulansın: oran 0.5 olsun (A4, 200px genişlik algılansın -> 210mm / 420px = 0.5)
    calibrated = calibrate_pattern_pieces(
        pattern_data=pattern,
        ref_object_type="a4",
        ref_bbox=[0, 0, 594, 420],  # piksel boyutları: w=420, h=594 (oran 210/420 = 0.5, 297/594 = 0.5)
        image_width=1000,
        image_height=1000
    )
    
    # Sonuçları doğrula
    assert calibrated["calibration_applied"] is True
    assert calibrated["scale_ratio_mm_per_pixel"] == 0.5
    
    # Koordinatlar:
    # Orijinal: (100, 100) -> (200, 100) -> (200, 300) -> (100, 100)
    # Ölçekli: (50, 50) -> (100, 50) -> (100, 150) -> (50, 50)
    # Normalize (min_x=50, min_y=50 çıkart): (0, 0) -> (50, 0) -> (50, 100) -> (0, 0)
    assert calibrated["pieces"]["on_beden"]["coords"] == [(0.0, 0.0), (50.0, 0.0), (50.0, 100.0), (0.0, 0.0)]
    
    # Ölçüler (100*0.5=50, 200*0.5=100)
    assert calibrated["pieces"]["on_beden"]["measurements"]["width"] == 50.0
    assert calibrated["pieces"]["on_beden"]["measurements"]["height"] == 100.0


if __name__ == "__main__":
    test_get_reference_dimensions()
    test_calculate_scale_ratio()
    test_scale_coordinates()
    test_calibrate_pattern_pieces()
    print("✅ TÜM KALİBRASYON TESTLERİ BAŞARIYLA GEÇTİ!")
