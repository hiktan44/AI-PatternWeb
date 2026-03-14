"""Geometri servisi — Shapely ile kalıp parça işlemleri"""
import json
from typing import Any

try:
    from shapely.geometry import Polygon, MultiPolygon, LineString
    from shapely.ops import unary_union
    from shapely.validation import explain_validity
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False


# Temel kalıp parça şablonları (mm cinsinden, baz beden M)
BASE_TEMPLATES = {
    "tshirt": {
        "front_body": [(0, 0), (0, 720), (50, 740), (225, 740), (240, 720), (240, 0), (200, -30), (160, -45), (80, -45), (40, -30)],
        "back_body": [(0, 0), (0, 730), (50, 750), (225, 750), (240, 730), (240, 0), (200, -25), (160, -35), (80, -35), (40, -25)],
        "sleeve": [(0, 0), (0, 250), (40, 255), (140, 255), (180, 250), (180, 0), (140, -40), (90, -55), (40, -40)],
    },
    "shirt": {
        "front_body": [(0, 0), (0, 740), (40, 760), (235, 760), (240, 740), (240, 0), (200, -30), (160, -48), (80, -48), (40, -30)],
        "back_body": [(0, 0), (0, 750), (40, 770), (235, 770), (240, 750), (240, 0), (200, -25), (160, -38), (80, -38), (40, -25)],
        "sleeve": [(0, 0), (0, 620), (40, 625), (150, 625), (190, 620), (190, 0), (150, -42), (95, -58), (40, -42)],
        "collar": [(0, 0), (0, 35), (190, 35), (190, 0)],
        "cuff": [(0, 0), (0, 65), (240, 65), (240, 0)],
    },
    "dress": {
        "front_body": [(0, 0), (0, 1000), (80, 1020), (200, 1020), (280, 1000), (280, 0), (240, -28), (180, -45), (100, -45), (40, -28)],
        "back_body": [(0, 0), (0, 1010), (80, 1030), (200, 1030), (280, 1010), (280, 0), (240, -22), (180, -35), (100, -35), (40, -22)],
        "sleeve": [(0, 0), (0, 200), (35, 205), (130, 205), (165, 200), (165, 0), (130, -35), (82, -48), (35, -35)],
    },
}

# TSE EN 13402 grading kuralları (mm, baz M, artış farkı)
GRADING_RULES = {
    "tshirt": {
        "width_increment": 20,     # Beden arası genişlik artışı (mm)
        "length_increment": 10,    # Beden arası boy artışı
        "sleeve_increment": 8,     # Kol boyu artışı
        "sizes": {"XS": -2, "S": -1, "M": 0, "L": 1, "XL": 2, "XXL": 3, "3XL": 4},
    },
    "shirt": {
        "width_increment": 20,
        "length_increment": 15,
        "sleeve_increment": 10,
        "sizes": {"XS": -2, "S": -1, "M": 0, "L": 1, "XL": 2, "XXL": 3},
    },
    "dress": {
        "width_increment": 20,
        "length_increment": 12,
        "sleeve_increment": 8,
        "sizes": {"XS": -2, "S": -1, "M": 0, "L": 1, "XL": 2},
    },
}

# Dikiş payı varsayılanları (mm)
DEFAULT_SEAM_ALLOWANCES = {
    "side_seam": 10,
    "shoulder": 10,
    "armhole": 10,
    "hem": 30,
    "neckline": 7,
    "cuff": 10,
    "center_back": 15,
}


def get_base_pattern(category: str) -> dict[str, list[tuple[float, float]]]:
    """Kategori için temel kalıp şablonunu döndür"""
    return BASE_TEMPLATES.get(category, BASE_TEMPLATES["tshirt"])


def grade_pattern(base_coords: list[tuple[float, float]], category: str, target_size: str) -> list[tuple[float, float]]:
    """Parçayı hedef bedene scale et"""
    rules = GRADING_RULES.get(category, GRADING_RULES["tshirt"])
    multiplier = rules["sizes"].get(target_size, 0)
    w_delta = rules["width_increment"] * multiplier
    l_delta = rules["length_increment"] * multiplier

    graded = []
    if not base_coords:
        return graded

    cx = sum(p[0] for p in base_coords) / len(base_coords)
    cy = sum(p[1] for p in base_coords) / len(base_coords)

    for x, y in base_coords:
        nx = x + (1 if x > cx else -1) * (w_delta / 2)
        ny = y + (1 if y > cy else -1) * (l_delta / 2)
        graded.append((round(nx, 1), round(ny, 1)))

    return graded


def add_seam_allowance(coords: list[tuple[float, float]], allowances: dict | None = None) -> list[tuple[float, float]]:
    """Parçaya dikiş payı ekle"""
    if not SHAPELY_AVAILABLE or len(coords) < 3:
        return coords

    sa = allowances or DEFAULT_SEAM_ALLOWANCES
    avg_sa = sum(sa.values()) / len(sa) if sa else 10

    polygon = Polygon(coords)
    if not polygon.is_valid:
        polygon = polygon.buffer(0)

    buffered = polygon.buffer(avg_sa, join_style=2)
    if isinstance(buffered, MultiPolygon):
        buffered = max(buffered.geoms, key=lambda g: g.area)

    return list(buffered.exterior.coords)


def validate_pattern(coords: list[tuple[float, float]]) -> dict[str, Any]:
    """Kalıp parçasını doğrula"""
    if not SHAPELY_AVAILABLE:
        return {"valid": True, "checks": [], "note": "Shapely not available"}

    checks = []
    polygon = Polygon(coords)

    # Kapalı kontür kontrolü
    is_closed = coords[0] == coords[-1] if coords else False
    checks.append({"check": "Kapalı kontür", "passed": is_closed or polygon.is_ring})

    # Self-intersection kontrolü
    is_valid = polygon.is_valid
    checks.append({"check": "Self-intersection yok", "passed": is_valid, "detail": explain_validity(polygon) if not is_valid else None})

    # Minimum alan kontrolü
    area_ok = polygon.area > 100
    checks.append({"check": "Minimum alan", "passed": area_ok, "area_mm2": round(polygon.area, 1)})

    # Aspect ratio kontrolü
    bounds = polygon.bounds
    w, h = bounds[2] - bounds[0], bounds[3] - bounds[1]
    ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 999
    ratio_ok = ratio < 10
    checks.append({"check": "Aspect ratio makul", "passed": ratio_ok, "ratio": round(ratio, 2)})

    all_passed = all(c["passed"] for c in checks)
    return {"valid": all_passed, "checks": checks}


def generate_marker_layout(pieces: list[dict], fabric_width: float = 1500) -> dict[str, Any]:
    """Basit greedy marker algoritması"""
    if not SHAPELY_AVAILABLE:
        return {"total_length": 0, "waste_percentage": 0, "placements": [], "note": "Shapely not available"}

    placements = []
    cursor_x, cursor_y = 0, 0
    row_height = 0
    total_area = 0

    for piece in pieces:
        coords = piece.get("coords", [])
        if len(coords) < 3:
            continue

        poly = Polygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)

        bounds = poly.bounds
        w, h = bounds[2] - bounds[0], bounds[3] - bounds[1]

        # Yeni satıra geç
        if cursor_x + w > fabric_width:
            cursor_x = 0
            cursor_y += row_height + 20
            row_height = 0

        placements.append({
            "piece_name": piece.get("name", "unnamed"),
            "x": round(cursor_x, 1),
            "y": round(cursor_y, 1),
            "width": round(w, 1),
            "height": round(h, 1),
        })

        total_area += poly.area
        cursor_x += w + 15
        row_height = max(row_height, h)

    total_length = cursor_y + row_height
    fabric_area = fabric_width * total_length if total_length > 0 else 1
    waste = max(0, (fabric_area - total_area) / fabric_area * 100)

    return {
        "total_length_mm": round(total_length, 1),
        "total_length_m": round(total_length / 1000, 2),
        "waste_percentage": round(waste, 1),
        "piece_count": len(placements),
        "placements": placements,
        "fabric_width_mm": fabric_width,
    }


def export_to_dxf_data(pieces: list[dict]) -> list[dict]:
    """DXF export için veri hazırla (gerçek DXF ezdxf ile oluşturulur)"""
    dxf_data = []
    for piece in pieces:
        dxf_data.append({
            "layer": piece.get("name", "PIECE"),
            "coords": piece.get("coords", []),
            "seam_coords": piece.get("seam_coords", []),
            "grainline": piece.get("grainline"),
            "notches": piece.get("notches", []),
            "labels": piece.get("labels", []),
        })
    return dxf_data
