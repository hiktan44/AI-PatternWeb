"""AI-PatternWeb Backend — Ana FastAPI uygulaması"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, projects, patterns, health


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Uygulama başlangıç ve kapatma olayları"""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Tabloları otomatik oluştur
    from app.core.database import engine, Base
    from app.models.user import User  # noqa: F401
    from app.models.project import Project, ProjectFile  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
