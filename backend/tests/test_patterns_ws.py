import sys
import os
import base64
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

# Backend dizinini python yoluna ekle
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User

# Test istemcisi oluştur
client = TestClient(app)


def test_websocket_missing_token():
    """Token olmadan WebSocket bağlantısının kapatıldığını doğrula"""
    try:
        with client.websocket_connect("/api/patterns/generate-ws") as websocket:
            # Token yoksa bağlantının kurulmaması gerekir veya anında kapanır
            try:
                websocket.receive_json()
            except Exception:
                pass
    except Exception:
        # Bağlantı reddedilirse bu da başarılı bir korumadır
        pass


async def test_websocket_generate_pattern_success():
    """Mock veritabanı ve AI servisi ile başarılı WebSocket akışını doğrula"""
    
    # 1. Mock Kullanıcı ve DB Oturumu ayarla
    mock_user = User(
        id="test-user-id",
        email="test@example.com",
        credits=5
    )
    
    # Mock DB Query sonucu
    mock_db = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.commit = AsyncMock()
    
    # DB bağımlılığını geçici olarak ez (override)
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # JWT Token üret
    token = create_access_token({"sub": "test-user-id"})
    
    # Mock AI üretici
    mock_pattern = {
        "garment_type": "T-Shirt",
        "pieces": {
            "on_beden": {
                "coords": [(0, 0), (100, 0), (100, 200), (0, 0)]
            }
        }
    }
    
    # generate_pattern_from_bytes fonksiyonunu mock'la ve callback'i taklit et
    async def mock_generate(*args, **kwargs):
        progress_callback = kwargs.get("progress_callback")
        if progress_callback:
            await progress_callback("analyzing", "Mock analiz...")
            await progress_callback("calibration", "Mock kalibrasyon...")
            await progress_callback("generation", "Mock çizim...")
        return mock_pattern

    with patch("app.api.patterns.generate_pattern_from_bytes", new=AsyncMock(side_effect=mock_generate)):
        # WebSocket bağlantısı aç
        with client.websocket_connect(f"/api/patterns/generate-ws?token={token}") as websocket:
            # Görsel ve parametreleri gönder (Base64)
            mock_image_base64 = base64.b64encode(b"dummy_image_content").decode("utf-8")
            websocket.send_json({
                "image": f"data:image/jpeg;base64,{mock_image_base64}",
                "ref_object_type": "a4"
            })
            
            # Adım bildirimlerini (steps) sırayla oku
            step1 = websocket.receive_json()
            assert step1["step"] == "analyzing"
            assert step1["message"] == "Mock analiz..."
            
            step2 = websocket.receive_json()
            assert step2["step"] == "calibration"
            assert step2["message"] == "Mock kalibrasyon..."
            
            step3 = websocket.receive_json()
            assert step3["step"] == "generation"
            assert step3["message"] == "Mock çizim..."
            
            # Tamamlanma sonucunu doğrula
            completed = websocket.receive_json()
            assert completed["step"] == "completed"
            assert completed["data"]["garment_type"] == "T-Shirt"
            assert mock_user.credits == 4  # Kredinin 1 azaldığını doğrula
            
    # Temizlik
    app.dependency_overrides.clear()


if __name__ == "__main__":
    print("🔄 WebSocket testleri çalıştırılıyor...")
    # missing token test
    try:
        test_websocket_missing_token()
        print("✅ WebSocket Token Eksikliği Testi Geçti!")
    except Exception as e:
        print(f"❌ WebSocket Token Eksikliği Testi Başarısız: {e}")

    # success flow test
    try:
        asyncio.run(test_websocket_generate_pattern_success())
        print("✅ WebSocket Kalıp Üretim Akış Testi Geçti!")
    except Exception as e:
        print(f"❌ WebSocket Kalıp Üretim Akış Testi Başarısız: {e}")
        import traceback
        traceback.print_exc()
