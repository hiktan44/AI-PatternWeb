"""Proje ve dosya erişimi: kimlik, istenen proje ve sahip birlikte doğrulanır."""
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectFile


def validate_identifier(value: str, label: str) -> None:
    try:
        uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail=f"Geçersiz {label} biçimi") from None


async def require_owned_project(db: AsyncSession, user_id: str, project_id: str) -> Project:
    validate_identifier(project_id, "proje kimliği")
    project = (await db.execute(select(Project).where(
        Project.id == project_id, Project.user_id == user_id,
    ))).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    return project


def owned_files_query(user_id: str, project_id: str):
    return select(ProjectFile).join(Project, Project.id == ProjectFile.project_id).where(
        Project.id == project_id, Project.user_id == user_id, ProjectFile.project_id == project_id,
    )


async def require_owned_file(db: AsyncSession, user_id: str, project_id: str, file_id: str) -> ProjectFile:
    validate_identifier(project_id, "proje kimliği")
    validate_identifier(file_id, "dosya kimliği")
    project_file = (await db.execute(owned_files_query(user_id, project_id).where(
        ProjectFile.id == file_id,
    ))).scalar_one_or_none()
    if project_file is None:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return project_file
