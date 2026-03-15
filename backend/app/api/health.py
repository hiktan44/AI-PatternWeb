"""Health check endpoint — Coolify zorunlu"""
import time

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health_check(request: Request):
    uptime = 0.0
    if hasattr(request.app.state, "startup_time"):
        uptime = time.time() - request.app.state.startup_time
    return {
        "status": "ok",
        "service": "AI-PatternWeb API",
        "version": "1.0.0",
        "timestamp": int(time.time() * 1000),
        "uptime": round(uptime, 2),
    }
