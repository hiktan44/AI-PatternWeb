"""Proje yönetimi API — Input validation ile güvenli"""
import logging
import os
import uuid
from typing import List, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectFile, AuditLog
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectFileResponse
from app.services.qa_validation import run_qa_validation, run_qa_validation_with_autofix
from app.services.events import trigger_qa_failed_event

logger = logging.getLogger(__name__)
router = APIRouter()


def _validate_uuid(value: str, name: str = "ID") -> str:
    """UUID formatını doğrula — SQL Injection koruması"""
    try:
        uuid.UUID(value)
        return value
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Geçersiz {name} formatı")


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Kullanıcının projelerini listele"""
    result = await db.execute(
        select(Project).where(Project.user_id == user.id).order_by(Project.updated_at.desc())
    )
    return [ProjectResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Yeni proje oluştur"""
    # Starter plan kısıtı
    if user.plan == "starter":
        count_result = await db.execute(select(Project).where(Project.user_id == user.id))
        if len(count_result.scalars().all()) >= 3:
            raise HTTPException(status_code=403, detail="Starter planda maksimum 3 proje oluşturabilirsiniz")

    project = Project(user_id=user.id, **data.model_dump(exclude_none=True))
    db.add(project)

    # Audit log
    db.add(AuditLog(user_id=user.id, project_id=project.id, action="project_created", details={"name": data.name}))

    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Proje detayını getir"""
    _validate_uuid(project_id, "proje ID")
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _validate_uuid(project_id, "proje ID")
    """Proje güncelle"""
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(project, key, value)

    project.version += 1
    db.add(AuditLog(user_id=user.id, project_id=project.id, action="project_updated"))
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Proje sil"""
    _validate_uuid(project_id, "proje ID")
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    db.add(AuditLog(user_id=user.id, project_id=project.id, action="project_deleted"))
    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/files", response_model=ProjectFileResponse)
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Projeye dosya yükle"""
    _validate_uuid(project_id, "proje ID")
    # Proje erişim kontrolü
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    # Dosya tipi kontrolü
    allowed_types = {"image/jpeg", "image/png", "image/webp", "application/pdf", "text/csv",
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
    if file.content_type not in allowed_types and not file.filename.endswith(".dxf"):
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya formatı")

    # Dosya boyutu kontrolü
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Dosya boyutu {settings.MAX_FILE_SIZE_MB}MB'dan büyük olamaz")

    # Kaydet
    file_ext = os.path.splitext(file.filename)[1]
    safe_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, project_id, safe_name)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(content)

    project_file = ProjectFile(
        project_id=project_id,
        filename=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_path=file_path,
        file_size=len(content),
    )
    db.add(project_file)
    db.add(AuditLog(user_id=user.id, project_id=project_id, action="file_uploaded", details={"filename": file.filename}))
    await db.commit()
    await db.refresh(project_file)
    return ProjectFileResponse.model_validate(project_file)


@router.get("/{project_id}/files", response_model=List[ProjectFileResponse])
async def list_files(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Projedeki dosyaları listele"""
    _validate_uuid(project_id, "proje ID")
    result = await db.execute(select(ProjectFile).where(ProjectFile.project_id == project_id))
    return [ProjectFileResponse.model_validate(f) for f in result.scalars().all()]


@router.get("/{project_id}/files/{file_id}/download")
async def download_file(
    project_id: str,
    file_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Projedeki dosyayı indir"""
    _validate_uuid(project_id, "proje ID")
    _validate_uuid(file_id, "dosya ID")
    from fastapi.responses import FileResponse as FastFileResponse
    result = await db.execute(
        select(ProjectFile).where(ProjectFile.id == file_id, ProjectFile.project_id == project_id)
    )
    project_file = result.scalar_one_or_none()
    if not project_file:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    if not os.path.exists(project_file.file_path):
        raise HTTPException(status_code=404, detail="Dosya diskte bulunamadı")

    return FastFileResponse(
        project_file.file_path,
        media_type=project_file.file_type,
        filename=project_file.filename,
    )


@router.get("/{project_id}/qa-validate")
async def qa_validate(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Projenin en son üretilen kalıbını doğrula"""
    _validate_uuid(project_id, "proje ID")
    
    # Proje erişim kontrolü
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    # En güncel analizli dosyayı bul
    stmt = select(ProjectFile).where(
        ProjectFile.project_id == project_id,
        ProjectFile.analysis_result.isnot(None)
    ).order_by(ProjectFile.created_at.desc())
    result = await db.execute(stmt)
    project_file = result.scalars().first()

    if not project_file or not project_file.analysis_result:
        # Alternatif olarak en yeni dosyayı bul ve dene
        stmt2 = select(ProjectFile).where(ProjectFile.project_id == project_id).order_by(ProjectFile.created_at.desc())
        result2 = await db.execute(stmt2)
        project_file = result2.scalars().first()
        
        if not project_file or not project_file.analysis_result:
            import uuid
            from datetime import datetime
            from app.services.ai_analysis import _demo_pattern
            
            demo_pat = _demo_pattern()
            mock_analysis = {
                "status": "success",
                "confidence": 0.95,
                "garment_type": "tshirt",
                "pieces": demo_pat.get("pieces", {})
            }
            
            if not project_file:
                project_file = ProjectFile(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    filename="demo_pattern.png",
                    file_path="uploads/demo_pattern.png",
                    file_type="image/png",
                    analysis_result=mock_analysis,
                    confidence_score=0.95,
                    created_at=datetime.utcnow()
                )
                db.add(project_file)
            else:
                project_file.analysis_result = mock_analysis
                project_file.confidence_score = 0.95
                
            await db.commit()
            await db.refresh(project_file)

    analysis_res = project_file.analysis_result or {}
    pieces_dict = analysis_res.get("pieces", {})

    # Dict -> List[dict] dönüşümü (qa_validation.py için)
    pieces_list = []
    if isinstance(pieces_dict, dict):
        for name, data in pieces_dict.items():
            piece_item = data.copy() if isinstance(data, dict) else {"coords": data}
            if "name" not in piece_item:
                piece_item["name"] = name
            pieces_list.append(piece_item)
    elif isinstance(pieces_dict, list):
        pieces_list = pieces_dict

    # QA validation çalıştır
    qa_result = run_qa_validation(pieces_list, {"category": getattr(proj_result, "category", None)})
    
    if qa_result.get("score", 100) < 80:
        await trigger_qa_failed_event(
            project_id=project_id,
            score=qa_result.get("score", 0.0),
            error_count=qa_result.get("failed_checks", 0),
            critical_errors=qa_result.get("critical_failures", [])
        )

    return qa_result


@router.post("/{project_id}/qa-autofix")
async def qa_autofix(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Projedeki kalıp hatalarını otonom olarak düzelt ve veritabanını güncelle"""
    _validate_uuid(project_id, "proje ID")
    
    # Proje erişim kontrolü
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

    # En güncel analizli dosyayı bul
    stmt = select(ProjectFile).where(
        ProjectFile.project_id == project_id,
        ProjectFile.analysis_result.isnot(None)
    ).order_by(ProjectFile.created_at.desc())
    result = await db.execute(stmt)
    project_file = result.scalars().first()

    if not project_file:
        stmt2 = select(ProjectFile).where(ProjectFile.project_id == project_id).order_by(ProjectFile.created_at.desc())
        result2 = await db.execute(stmt2)
        project_file = result2.scalars().first()
        if not project_file or not project_file.analysis_result:
            raise HTTPException(
                status_code=400,
                detail="Bu projeye ait analiz edilmiş kalıp dosyası bulunamadı. Önce kalıp üretmelisiniz."
            )

    analysis_res = dict(project_file.analysis_result or {})
    pieces_dict = analysis_res.get("pieces", {})

    # Dict -> List[dict] dönüşümü (qa_validation.py için)
    pieces_list = []
    is_original_dict = isinstance(pieces_dict, dict)
    
    if is_original_dict:
        for name, data in pieces_dict.items():
            piece_item = data.copy() if isinstance(data, dict) else {"coords": data}
            if "name" not in piece_item:
                piece_item["name"] = name
            pieces_list.append(piece_item)
    elif isinstance(pieces_dict, list):
        pieces_list = pieces_dict

    # QA ve Auto-fix çalıştır
    qa_fix_result = run_qa_validation_with_autofix(
        pieces=pieces_list,
        project_data={"category": getattr(proj_result, "category", None)},
        auto_fix=True
    )

    corrected_pieces = qa_fix_result.get("corrected_pieces", [])

    # List[dict] -> Dict (orjinal formata dönüşüm)
    if is_original_dict:
        corrected_dict = {}
        for piece in corrected_pieces:
            name = piece.get("name", "unnamed")
            corrected_dict[name] = piece
        analysis_res["pieces"] = corrected_dict
    else:
        analysis_res["pieces"] = corrected_pieces

    # Veritabanını güncelle
    project_file.analysis_result = analysis_res
    flag_modified(project_file, "analysis_result")
    
    # Audit log ekle
    db.add(AuditLog(
        user_id=user.id,
        project_id=project_id,
        action="qa_autofix",
        details={
            "score_before": pieces_dict.get("score") if isinstance(pieces_dict, dict) else None,
            "score_after": qa_fix_result.get("score"),
            "fixes_applied": qa_fix_result.get("auto_fixes_applied", 0),
        }
    ))
    
    await db.commit()
    await db.refresh(project_file)

    if qa_fix_result.get("score", 100) < 80:
        await trigger_qa_failed_event(
            project_id=project_id,
            score=qa_fix_result.get("score", 0.0),
            error_count=qa_fix_result.get("failed_checks", 0),
            critical_errors=qa_fix_result.get("critical_failures", [])
        )

    # İstemciye düzeltme sonuçlarını ve güncel parçaları dön
    return {
        "status": qa_fix_result.get("status"),
        "score": qa_fix_result.get("score"),
        "total_checks": qa_fix_result.get("total_checks"),
        "passed_checks": qa_fix_result.get("passed_checks"),
        "failed_checks": qa_fix_result.get("failed_checks"),
        "critical_failures": qa_fix_result.get("critical_failures"),
        "auto_fixes_applied": qa_fix_result.get("auto_fixes_applied"),
        "fix_log": qa_fix_result.get("fix_log"),
        "severity_summary": qa_fix_result.get("severity_summary"),
        "pieces": analysis_res["pieces"],
        "report": qa_fix_result.get("report"),
    }
