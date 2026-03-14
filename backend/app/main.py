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
    yield


app = FastAPI(
    title="AI-PatternWeb API",
    description="AI destekli, kural tabanlı, üretim güvenli pattern engineering platformu",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(patterns.router, prefix="/api/patterns", tags=["patterns"])
