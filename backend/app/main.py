"""AI-PatternWeb Backend — Ana FastAPI uygulaması"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, projects, patterns, health

# Logging yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Uygulama başlangıç ve kapatma olayları"""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # GEMINI_API_KEY debug
    env_key = os.environ.get("GEMINI_API_KEY", "")
    settings_key = settings.GEMINI_API_KEY
    logger.info(f"🔑 GEMINI_API_KEY durumu: settings={bool(settings_key)} (len={len(settings_key)}), env={bool(env_key)} (len={len(env_key)})")
    if env_key and not settings_key:
        logger.warning("⚠️ GEMINI_API_KEY os.environ'da var ama settings'de YOK — pydantic yükleyememiş olabilir")

    # Tabloları otomatik oluştur
    from app.core.database import engine, Base
    from app.models.user import User  # noqa: F401
    from app.models.project import Project, ProjectFile  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Veritabanı tabloları oluşturuldu, uygulama hazır")
    yield


app = FastAPI(
    title="AI-PatternWeb API",
    description="AI destekli, kural tabanlı, üretim güvenli pattern engineering platformu",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — JWT Bearer kullanıldığı için credentials gerekmez
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])
