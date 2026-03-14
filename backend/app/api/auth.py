"""Auth API — Kayıt, giriş, Google OAuth ve token yönetimi"""
import uuid
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    token: str
    is_access_token: bool = False


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Yeni kullanıcı kaydı"""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu email adresi zaten kayıtlı")

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Kullanıcı girişi"""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hesabınız devre dışı")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Mevcut kullanıcı bilgisi"""
    return UserResponse.model_validate(user)


@router.post("/google", response_model=TokenResponse)
async def google_login(data: GoogleTokenRequest, db: AsyncSession = Depends(get_db)):
    """Google OAuth ile giriş/kayıt"""
    google_user_info = None

    try:
        if data.is_access_token:
            # Google access_token ile userinfo al
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {data.token}"},
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=401, detail="Google token geçersiz")
                google_user_info = resp.json()
        else:
            # Google id_token doğrula
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={data.token}"
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=401, detail="Google token geçersiz")
                google_user_info = resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Google sunucusuna ulaşılamadı")

    email = google_user_info.get("email")
    name = google_user_info.get("name") or google_user_info.get("given_name", "Kullanıcı")

    if not email:
        raise HTTPException(status_code=400, detail="Google hesabından email alınamadı")

    # Kullanıcıyı bul veya oluştur
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            name=name,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            email_verified=True,
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Hesabınız devre dışı")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
