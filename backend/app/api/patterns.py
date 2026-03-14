"""Pattern API — AI analiz, geometri işlemleri, grading, marker ve export"""
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.services.ai_analysis import analyze_image, validate_measurements, generate_pattern_from_image, generate_pattern_with_analysis
from app.services.geometry import (
    get_base_pattern, grade_pattern, add_seam_allowance,
    validate_pattern, generate_marker_layout, export_to_dxf_data,
    DEFAULT_SEAM_ALLOWANCES, GRADING_RULES,
)
from app.services.export import create_dxf, create_pdf_report

router = APIRouter()


class AnalyzeRequest(BaseModel):
    project_id: str
    file_id: str


class GradeRequest(BaseModel):
    project_id: str
    category: str = ""
    base_size: str = "M"
    target_sizes: List[str] = ["S", "M", "L", "XL"]
    standard: str = "tse"
    file_id: str = ""


class SeamRequest(BaseModel):
    project_id: str
    allowances: dict | None = None


class MarkerRequest(BaseModel):
    project_id: str
    fabric_width: float = 1500
    layout_type: str = "double"


class MeasurementRequest(BaseModel):
    measurements: dict


class ExportRequest(BaseModel):
    project_id: str
    format: str = "dxf"


@router.get("/categories")
async def list_categories():
    """Desteklenen garment kategorilerini listele"""
    return {
        "categories": [
            {"id": "tshirt", "name": "Basic Tişört", "icon": "👕", "available": True},
            {"id": "shirt", "name": "Basic Gömlek", "icon": "👔", "available": True},
            {"id": "dress", "name": "Düz Elbise", "icon": "👗", "available": True},
            {"id": "skirt", "name": "Etek", "icon": "🩳", "available": True},
            {"id": "pants", "name": "Basic Pantolon", "icon": "👖", "available": True},
            {"id": "blouse", "name": "Bluz", "icon": "👚", "available": True},
            {"id": "jacket", "name": "Ceket", "icon": "🧥", "available": True},
            {"id": "custom", "name": "Özel (AI ile)", "icon": "✨", "available": True},
        ]
    }


@router.post("/analyze")
async def analyze_file(
    data: AnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Yüklenen dosyayı AI ile analiz et"""
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    file_result = await db.execute(select(ProjectFile).where(ProjectFile.id == data.file_id))
    project_file = file_result.scalar_one_or_none()
    if not project_file:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    if user.credits <= 0:
        raise HTTPException(status_code=402, detail="Yetersiz kredi")

    analysis = await analyze_image(project_file.file_path)

    project_file.analysis_result = analysis
    project_file.confidence_score = analysis.get("confidence", 0)
    user.credits -= 1
    await db.commit()

    return {"analysis": analysis, "remaining_credits": user.credits}


@router.post("/validate-measurements")
async def validate_meas(
    data: MeasurementRequest,
    user: User = Depends(get_current_user),
):
    """Ölçü tablosunu doğrula"""
    result = await validate_measurements(data.measurements)
    return result


@router.post("/generate-pattern")
async def generate_pattern(
    data: GradeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI ile resimden gerçek kalıp üret veya şablondan oluştur"""
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    # Dosya varsa AI ile resimden kalıp üret
    ai_pattern = None
    if data.file_id:
        file_result = await db.execute(select(ProjectFile).where(ProjectFile.id == data.file_id))
        project_file = file_result.scalar_one_or_none()

        if project_file and os.path.exists(project_file.file_path):
            # Önceki analiz sonuçları varsa kullan
            if project_file.analysis_result:
                ai_pattern = await generate_pattern_with_analysis(
                    project_file.file_path, project_file.analysis_result
                )
            else:
                ai_pattern = await generate_pattern_from_image(project_file.file_path)
    else:
        # file_id yoksa, proje dosyalarından ilk resmi bul
        files_result = await db.execute(
            select(ProjectFile).where(ProjectFile.project_id == data.project_id)
        )
        project_files = files_result.scalars().all()
        for pf in project_files:
            if pf.file_path and os.path.exists(pf.file_path):
                ext = os.path.splitext(pf.file_path)[1].lower()
                if ext in [".jpg", ".jpeg", ".png", ".webp"]:
                    if pf.analysis_result:
                        ai_pattern = await generate_pattern_with_analysis(
                            pf.file_path, pf.analysis_result
                        )
                    else:
                        ai_pattern = await generate_pattern_from_image(pf.file_path)
                    break

    # AI kalıp başarılıysa döndür
    if ai_pattern and "pieces" in ai_pattern and not ai_pattern.get("error"):
        project.category = ai_pattern.get("garment_type", data.category or "custom")
        project.base_size = data.base_size
        project.target_sizes = {"sizes": data.target_sizes, "standard": data.standard}
        await db.commit()

        return {
            "ai_generated": True,
            "garment_type": ai_pattern.get("garment_type", ""),
            "pieces": ai_pattern.get("pieces", {}),
            "total_piece_count": ai_pattern.get("total_piece_count", 0),
            "assembly_order": ai_pattern.get("assembly_order", []),
            "grading_notes": ai_pattern.get("grading_notes", ""),
            "base_size": data.base_size,
        }

    # Fallback: Sabit şablonlardan oluştur
    category = data.category or project.category or "tshirt"
    base_template = get_base_pattern(category)
    graded_sizes = {}

    for size in data.target_sizes:
        graded_pieces = {}
        for piece_name, coords in base_template.items():
            graded = grade_pattern(coords, category, size)
            graded_pieces[piece_name] = {
                "coords": graded,
                "validation": validate_pattern(graded),
            }
        graded_sizes[size] = graded_pieces

    project.target_sizes = {"sizes": data.target_sizes, "standard": data.standard}
    project.base_size = data.base_size
    project.category = category
    await db.commit()

    return {
        "ai_generated": False,
        "fallback_reason": "AI kalıp üretilemedi, sabit şablon kullanıldı",
        "base_template": {k: {"coords": v, "piece_count": 1} for k, v in base_template.items()},
        "graded_sizes": graded_sizes,
        "grading_rules": GRADING_RULES.get(category),
    }


@router.post("/seam-allowance")
async def apply_seam(
    data: SeamRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Parçalara dikiş payı ekle"""
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    category = project.category or "tshirt"
    base = get_base_pattern(category)
    allowances = data.allowances or DEFAULT_SEAM_ALLOWANCES

    pieces_with_seam = {}
    for piece_name, coords in base.items():
        seam_coords = add_seam_allowance(coords, allowances)
        pieces_with_seam[piece_name] = {
            "original_coords": coords,
            "seam_coords": seam_coords,
            "allowances": allowances,
        }

    return {"pieces": pieces_with_seam, "applied_allowances": allowances}


@router.post("/marker")
async def calculate_marker(
    data: MarkerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pastal/marker yerleşimi hesapla"""
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    category = project.category or "tshirt"
    base = get_base_pattern(category)

    pieces = [{"name": name, "coords": coords} for name, coords in base.items()]
    # Çift kat serim — simetrik parçaları çoğalt
    if data.layout_type == "double":
        mirrored = []
        for p in pieces:
            mirrored.append(p)
            if p["name"] in ["sleeve"]:
                mirrored.append({"name": f"{p['name']}_mirror", "coords": p["coords"]})
        pieces = mirrored

    layout = generate_marker_layout(pieces, data.fabric_width)
    return layout


@router.post("/export")
async def export_pattern(
    data: ExportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kalıbı DXF veya PDF olarak export et"""
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    category = project.category or "tshirt"
    base = get_base_pattern(category)

    if data.format == "dxf":
        dxf_pieces = export_to_dxf_data([
            {"name": name, "coords": coords, "seam_coords": add_seam_allowance(coords)}
            for name, coords in base.items()
        ])

        output_path = os.path.join(settings.UPLOAD_DIR, data.project_id, f"{project.name}_{uuid.uuid4().hex[:8]}.dxf")
        create_dxf(dxf_pieces, output_path)

        with open(output_path, "rb") as f:
            content = f.read()

        return Response(
            content=content,
            media_type="application/dxf",
            headers={"Content-Disposition": f'attachment; filename="{project.name}.dxf"'},
        )

    elif data.format == "pdf":
        pdf_bytes = create_pdf_report({
            "name": project.name,
            "category": category,
            "base_size": project.base_size,
            "fabric_width": project.fabric_width,
            "version": project.version,
            "status": project.status,
        })
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{project.name}_report.pdf"'},
        )

    raise HTTPException(status_code=400, detail="Desteklenmeyen format. 'dxf' veya 'pdf' kullanın.")
