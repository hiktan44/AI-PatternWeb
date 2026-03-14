"""Kullanıcı modeli"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Enum, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserRole(str, PyEnum):
    ADMIN = "admin"
    TECHNICAL_DESIGNER = "technical_designer"
    PATTERN_MAKER = "pattern_maker"
    REVIEWER = "reviewer"
    PRODUCTION_PLANNER = "production_planner"
    VIEWER = "viewer"


class UserPlan(str, PyEnum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    STUDIO = "studio"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(Enum(UserRole), default=UserRole.TECHNICAL_DESIGNER)
    plan: Mapped[str] = mapped_column(Enum(UserPlan), default=UserPlan.STARTER)
    credits: Mapped[int] = mapped_column(Integer, default=50)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
