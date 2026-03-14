"""Pydantic şemaları — request/response modelleri"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ========== AUTH ==========
class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    plan: str
    credits: int
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ========== PROJECTS ==========
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = None
    season: str | None = None
    brand: str | None = None
    collection: str | None = None
    base_size: str | None = None
    fabric_width: str | None = None
    fabric_type: str | None = None
    notes: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    status: str | None = None
    season: str | None = None
    brand: str | None = None
    collection: str | None = None
    base_size: str | None = None
    target_sizes: dict | None = None
    fabric_width: str | None = None
    fabric_type: str | None = None
    notes: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    category: str | None
    status: str
    season: str | None
    brand: str | None
    base_size: str | None
    fabric_width: str | None
    fabric_type: str | None
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectFileResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    confidence_score: float | None
    analysis_result: dict | None
    created_at: datetime

    class Config:
        from_attributes = True
