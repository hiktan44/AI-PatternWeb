"""Auth API — Kayıt, giriş, Google OAuth ve token yönetimi (Güvenlik Kuralı Uygulanmış)"""
import logging
import re
import time
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.database import get_db
from app.core.google_identity import verify_google_identity
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Login Brute-force Koruması ──
_login_attempts: dict[str, list[float]] = {}
LOGIN_LIMIT_WINDOW = 15 * 60  # 15 dakika
LOGIN_MAX_ATTEMPTS = 5  # 5 başarısız deneme

_EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

def _check_login_rate(email: str):
    now = time.time()
    key = email.lower().strip()
    if key in _login_attempts:
        _login_attempts[key] = [t for t in _login_attempts[key] if now - t < LOGIN_LIMIT_WINDOW]
    else:
        _login_attempts[key] = []
    if len(_login_attempts[key]) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Çok fazla başarısız giriş denemesi. 15 dakika sonra tekrar deneyin.")

def _record_failed_login(email: str):
    _login_attempts.setdefault(email.lower().strip(), []).append(time.time())

def _validate_email(email: str) -> str:
    email = email.strip().lower()
    if not _EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Geçersiz email formatı")
    if len(email) > 254:
        raise HTTPException(status_code=400, detail="Email çok uzun")
    return email

def _validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Şifre en az 8 karakter olmalıdır")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="Şifre çok uzun")


class GoogleTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=16384)
    is_access_token: bool = False


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Yeni kullanıcı kaydı"""
    email = _validate_email(data.email)
    _validate_password(data.password)

    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu email adresi zaten kayıtlı")

    user = User(
        email=email,
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
    email = _validate_email(data.email)
    _check_login_rate(email)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        _record_failed_login(email)
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
    """İmzalı ID tokenını doğrula, kalıcı Google subject ile hesabı çöz."""
    if data.is_access_token:
        raise HTTPException(status_code=401, detail="Bu giriş için Google ID tokenı gerekiyor")
    identity = await run_in_threadpool(verify_google_identity, data.token)
    user = (await db.execute(select(User).where(User.google_sub == identity.subject))).scalar_one_or_none()
    if user is None:
        # Eski hesabı bağlayan işlemler aynı satır üzerinde sıraya girer.
        user = (await db.execute(
            select(User).where(User.email == identity.email).with_for_update()
        )).scalar_one_or_none()
        if user is not None:
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Hesabınız devre dışı")
            if user.google_sub != identity.subject:
                if user.google_sub is not None or not user.email_verified or not identity.authoritative_email:
                    raise HTTPException(status_code=409, detail="Mevcut hesabı doğrulayarak Google hesabını bağlamanız gerekiyor")
                user.google_sub = identity.subject
        else:
            user = User(
                email=identity.email,
                google_sub=identity.subject,
                name=identity.name,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                email_verified=True,
                trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
            )
            db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            # Eşzamanlı kayıt yalnız aynı subject'e ait hesapla devam edebilir.
            await db.rollback()
            user = (await db.execute(select(User).where(User.google_sub == identity.subject))).scalar_one_or_none()
            if user is None:
                raise HTTPException(status_code=409, detail="Google hesabı güvenli biçimde bağlanamadı") from None
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hesabınız devre dışı")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
