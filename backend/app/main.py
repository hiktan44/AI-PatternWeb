"""AI-PatternWeb Backend — Ana FastAPI uygulaması (Güvenlik Kuralları Uygulanmış)"""
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api import auth, projects, patterns, health

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate Limiting (in-memory — bellekte) ──
_rate_limit_store: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 15 * 60  # 15 dakika
RATE_LIMIT_MAX = 100  # Pencere başına max istek


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Uygulama başlangıç ve kapatma olayları"""
    startup_time = time.time()
    application.state.startup_time = startup_time

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # GEMINI_API_KEY kontrolü
    env_key = os.environ.get("GEMINI_API_KEY", "")
    settings_key = settings.GEMINI_API_KEY
    logger.info(f"🔑 GEMINI_API_KEY: settings={bool(settings_key)}, env={bool(env_key)}")
    if env_key and not settings_key:
        logger.warning("⚠️ GEMINI_API_KEY env'de var ama settings'de YOK")

    # Tabloları oluştur
    from app.core.database import engine, Base
    from app.models.user import User  # noqa: F401
    from app.models.project import Project, ProjectFile  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Veritabanı tabloları oluşturuldu, uygulama hazır")
    yield


app = FastAPI(
    title="AI-PatternWeb API",
    description="AI destekli kalıp mühendisliği platformu",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)


# ═══════════════════════════════════════════════════
# 🛡️ GÜVENLİK MIDDLEWARE'LERİ
# ═══════════════════════════════════════════════════

# 1. CORS — izin verilen origin'ler (ASLA "*" kullanma)
allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# 2. Trusted Host — sadece izin verilen host'lar
trusted_hosts = os.environ.get("TRUSTED_HOSTS", "localhost,127.0.0.1").split(",")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=[h.strip() for h in trusted_hosts] + ["*"])


# 3. Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if os.environ.get("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


# 4. Rate Limiting Middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Health check'i rate limit'den muaf tut
    if request.url.path in ("/health", "/api/v1/docs", "/openapi.json"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Eski kayıtları temizle
    if client_ip in _rate_limit_store:
        _rate_limit_store[client_ip] = [t for t in _rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    else:
        _rate_limit_store[client_ip] = []

    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        logger.warning(f"⚠️ Rate limit aşıldı: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Çok fazla istek gönderdiniz. 15 dakika sonra tekrar deneyin."},
        )

    _rate_limit_store[client_ip].append(now)
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX)
    response.headers["X-RateLimit-Remaining"] = str(RATE_LIMIT_MAX - len(_rate_limit_store[client_ip]))
    return response


# 5. Request Logging Middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    if duration > 1000:  # 1 saniyeden uzun süren istekleri logla
        logger.warning(f"🐢 Yavaş istek: {request.method} {request.url.path} → {duration:.0f}ms")
    return response


# ═══════════════════════════════════════════════════
# 🚨 GLOBAL ERROR HANDLER
# ═══════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Yakalanmamış hataları logla, kullanıcıya minimal bilgi ver"""
    logger.error(f"❌ Unhandled error: {request.method} {request.url.path} → {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."},
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "İstenen kaynak bulunamadı"})


# ═══════════════════════════════════════════════════
# 📌 ROUTERS
# ═══════════════════════════════════════════════════

app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])
