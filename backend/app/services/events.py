"""Otonom iş akışı tetikleyicileri (Webhook & Integration Events)"""
import logging
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("patternweb.events")

async def send_webhook_notification(
    event_type: str,
    payload: Dict[str, Any],
    webhook_url: Optional[str]
) -> bool:
    """Belirtilen webhook URL'sine asenkron POST isteği gönderir."""
    if not webhook_url:
        logger.debug(f"Webhook URL tanımlı değil, event atlandı: {event_type}")
        return False

    headers = {
        "Content-Type": "application/json",
        "X-PatternWeb-Event": event_type
    }
    
    data = {
        "event": event_type,
        "payload": payload
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=data, headers=headers)
            if response.status_code in [200, 201, 202]:
                logger.info(f"Webhook başarıyla tetiklendi [{event_type}]: {response.status_code}")
                return True
            else:
                logger.warning(
                    f"Webhook başarısız yanıt döndürdü [{event_type}]: {response.status_code} - {response.text}"
                )
                return False
    except httpx.RequestError as exc:
        logger.error(f"Webhook isteği sırasında ağ hatası oluştu [{event_type}]: {exc}")
        return False
    except Exception as exc:
        logger.error(f"Webhook gönderiminde beklenmeyen hata oluştu [{event_type}]: {exc}")
        return False


async def trigger_pattern_generated_event(
    project_id: str,
    model_name: str,
    status: str,
    user_id: Optional[str] = None
) -> None:
    """Kalıp üretimi tamamlandığında veya hata verdiğinde tetiklenen olay."""
    payload = {
        "project_id": str(project_id),
        "model_name": model_name,
        "status": status,
        "user_id": str(user_id) if user_id else None
    }
    
    # Zapier ve n8n webhook'larını paralel tetikle
    if settings.ZAPIER_WEBHOOK_URL:
        await send_webhook_notification("pattern.generated", payload, settings.ZAPIER_WEBHOOK_URL)
    if settings.N8N_WEBHOOK_URL:
        await send_webhook_notification("pattern.generated", payload, settings.N8N_WEBHOOK_URL)


async def trigger_export_event(
    project_id: str,
    export_format: str,
    status: str,
    user_id: Optional[str] = None
) -> None:
    """Kalıp başarıyla ihraç edildiğinde (export) tetiklenen olay."""
    payload = {
        "project_id": str(project_id),
        "export_format": export_format,
        "status": status,
        "user_id": str(user_id) if user_id else None
    }
    
    if settings.ZAPIER_WEBHOOK_URL:
        await send_webhook_notification("pattern.exported", payload, settings.ZAPIER_WEBHOOK_URL)
    if settings.N8N_WEBHOOK_URL:
        await send_webhook_notification("pattern.exported", payload, settings.N8N_WEBHOOK_URL)


async def trigger_qa_failed_event(
    project_id: str,
    score: float,
    error_count: int,
    critical_errors: list
) -> None:
    """QA Kalite Güvence testleri kritik hata veya düşük skor verdiğinde tetiklenen olay."""
    payload = {
        "project_id": str(project_id),
        "quality_score": score,
        "error_count": error_count,
        "critical_errors": critical_errors
    }
    
    if settings.ZAPIER_WEBHOOK_URL:
        await send_webhook_notification("qa.validation.failed", payload, settings.ZAPIER_WEBHOOK_URL)
    if settings.N8N_WEBHOOK_URL:
        await send_webhook_notification("qa.validation.failed", payload, settings.N8N_WEBHOOK_URL)
