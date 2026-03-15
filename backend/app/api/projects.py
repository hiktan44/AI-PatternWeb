"""Proje yönetimi API"""
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectFile, AuditLog
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectFileResponse

router = APIRouter()


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
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
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
