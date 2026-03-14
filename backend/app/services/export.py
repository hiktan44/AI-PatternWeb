"""DXF Export servisi — ezdxf ile production-ready DXF oluşturma"""
import io
import os
from typing import Any

try:
    import ezdxf
    from ezdxf.enums import TextEntityAlignment
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False


def create_dxf(pieces: list[dict], output_path: str | None = None) -> bytes | str:
    """Kalıp parçalarından DXF dosyası oluştur"""
    if not EZDXF_AVAILABLE:
        raise RuntimeError("ezdxf kütüphanesi yüklü değil")

    doc = ezdxf.new(dxfversion="R2010")
    msp = doc.modelspace()

    # Katmanları oluştur
    doc.layers.add("PATTERN", color=5)       # Mavi - ana kalıp
    doc.layers.add("SEAM", color=1)          # Kırmızı - dikiş payı
    doc.layers.add("GRAINLINE", color=3)     # Yeşil - kumaş yönü
    doc.layers.add("NOTCH", color=6)         # Magenta - çentik
    doc.layers.add("LABEL", color=7)         # Beyaz - etiket
    doc.layers.add("DRILLMARK", color=4)     # Cyan - matkap işareti

    for piece in pieces:
        name = piece.get("layer", "PIECE")
        coords = piece.get("coords", [])
        seam_coords = piece.get("seam_coords", [])

        if len(coords) < 3:
            continue

        # Ana kalıp çizgisi
        points = [(x, y) for x, y in coords]
        if points[0] != points[-1]:
            points.append(points[0])
        msp.add_lwpolyline(points, dxfattribs={"layer": "PATTERN"})

        # Dikiş payı çizgisi
        if seam_coords and len(seam_coords) >= 3:
            seam_points = [(x, y) for x, y in seam_coords]
            if seam_points[0] != seam_points[-1]:
                seam_points.append(seam_points[0])
            msp.add_lwpolyline(seam_points, dxfattribs={"layer": "SEAM"})

        # Grainline
        grainline = piece.get("grainline")
        if grainline and len(grainline) == 2:
            msp.add_line(
                (grainline[0][0], grainline[0][1]),
                (grainline[1][0], grainline[1][1]),
                dxfattribs={"layer": "GRAINLINE"},
            )

        # Notch'lar
        for notch in piece.get("notches", []):
            if len(notch) == 2:
                msp.add_circle((notch[0], notch[1]), radius=2, dxfattribs={"layer": "NOTCH"})

        # Etiket
        for label in piece.get("labels", []):
            pos = label.get("position", [0, 0])
            text = label.get("text", name)
            msp.add_text(
                text,
                height=8,
                dxfattribs={"layer": "LABEL"},
            ).set_placement((pos[0], pos[1]))

        # Parça adı (merkez)
        if coords:
            cx = sum(p[0] for p in coords) / len(coords)
            cy = sum(p[1] for p in coords) / len(coords)
            msp.add_text(name, height=10, dxfattribs={"layer": "LABEL"}).set_placement((cx, cy))

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.saveas(output_path)
        return output_path

    stream = io.BytesIO()
    doc.write(stream)
    return stream.getvalue()


def create_pdf_report(project_data: dict) -> bytes:
    """Üretim raporu PDF'i oluştur (placeholder)"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as pdf_canvas

        buffer = io.BytesIO()
        c = pdf_canvas.Canvas(buffer, pagesize=A4)
        w, h = A4

        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, h - 60, "AI-PatternWeb")
        c.setFont("Helvetica", 14)
        c.drawString(50, h - 90, "Uretim Raporu")

        y = h - 140
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"Proje: {project_data.get('name', 'N/A')}")
        y -= 25
        c.setFont("Helvetica", 11)

        info_lines = [
            f"Kategori: {project_data.get('category', 'N/A')}",
            f"Baz Beden: {project_data.get('base_size', 'M')}",
            f"Kumaş Eni: {project_data.get('fabric_width', '150')} cm",
            f"Versiyon: {project_data.get('version', 1)}",
            f"Durum: {project_data.get('status', 'draft')}",
        ]

        for line in info_lines:
            c.drawString(50, y, line)
            y -= 20

        c.showPage()
        c.save()
        return buffer.getvalue()
    except ImportError:
        return b"ReportLab not available"
