import sys
import os
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

# Backend dizinini python yoluna ekle
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.project import Project, ProjectFile

client = TestClient(app)


async def test_qa_validate_and_autofix_success():
    """Mock veritabanı ile QA validation ve Auto-fix rotalarının entegrasyon testi"""
    
    # 1. Mock nesneleri hazırla
    mock_user = User(
        id="660e8400-e29b-41d4-a716-446655440000",
        email="qa-tester@example.com",
        credits=10
    )

    mock_project = Project(
        id="550e8400-e29b-41d4-a716-446655440000",
        user_id="660e8400-e29b-41d4-a716-446655440000",
        name="QA Test Projesi",
        category="tshirt"
    )

    # Hatalı koordinatlara sahip parça (closed_contour hatası - ilk ve son noktalar farklı)
    bad_pieces = {
        "on_beden": {
            "name": "on_beden",
            "coords": [[0, 0], [100, 0], [100, 100]],  # Kapatılmamış kontür
            "grainline": "vertical",
            "seam_coords": [[0, 0], [100, 0], [100, 100]]
        }
    }

    mock_file = ProjectFile(
        id="770e8400-e29b-41d4-a716-446655440000",
        project_id="550e8400-e29b-41d4-a716-446655440000",
        filename="pattern.png",
        file_type="image/png",
        file_path="/dummy/path.png",
        analysis_result={"pieces": bad_pieces}
    )

    # 2. Mock Veritabanı sorguları
    mock_db = MagicMock()
    
    # Sırayla sorguların döneceği mock sonuçları ayarla
    # select(Project).where(...) -> mock_project
    # select(ProjectFile).where(...) -> mock_file
    mock_proj_res = MagicMock()
    mock_proj_res.scalar_one_or_none.return_value = mock_project
    
    mock_file_res = MagicMock()
    mock_file_res.scalars.return_value.first.return_value = mock_file

    async def mock_execute(query, *args, **kwargs):
        # Sorgunun içeriğine göre mock sonuç dön
        query_str = str(query)
        if "FROM projects" in query_str:
            return mock_proj_res
        elif "FROM project_files" in query_str:
            return mock_file_res
        return MagicMock()

    mock_db.execute = AsyncMock(side_effect=mock_execute)
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.add = MagicMock()

    # DB Bağımlılığını ez
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # JWT Token üret
    token = create_access_token({"sub": "660e8400-e29b-41d4-a716-446655440000"})
    headers = {"Authorization": f"Bearer {token}"}

    # 3. GET /qa-validate test
    response_val = client.get(
        f"/api/projects/550e8400-e29b-41d4-a716-446655440000/qa-validate",
        headers=headers
    )
    
    print(f"DEBUG RESPONSE: {response_val.status_code} - {response_val.text}")
    assert response_val.status_code == 200
    val_json = response_val.json()
    
    # En azından closed_contour testinden kalmış olmalı (çünkü kapalı değil)
    assert val_json["status"] == "FAILED"
    assert val_json["score"] < 100
    
    # Kapalı kontür kontrolünün fail ettiğini doğrula
    closed_contour_check = next(
        (r for r in val_json["results"] if r["id"] == "closed_contour"), None
    )
    assert closed_contour_check is not None
    assert closed_contour_check["passed"] is False

    # 4. POST /qa-autofix test
    response_fix = client.post(
        f"/api/projects/550e8400-e29b-41d4-a716-446655440000/qa-autofix",
        headers=headers
    )

    assert response_fix.status_code == 200
    fix_json = response_fix.json()

    # Hatanın otonom olarak düzeltilmiş olmasını doğrula
    assert fix_json["status"] == "PASSED"
    assert fix_json["score"] == 100
    assert fix_json["auto_fixes_applied"] > 0
    
    # Düzeltilen parçanın koordinatlarının kapandığını doğrula (ilk ve son nokta eşit)
    fixed_pieces = fix_json["pieces"]
    on_beden_fixed = fixed_pieces["on_beden"]
    coords = on_beden_fixed["coords"]
    assert coords[0] == coords[-1]  # İlk ve son nokta eşitlendi

    # DB commit ve refresh çağrıldığını doğrula
    assert mock_db.commit.called
    
    # Temizlik
    app.dependency_overrides.clear()


if __name__ == "__main__":
    print("🔄 QA Endpoints entegrasyon testleri çalıştırılıyor...")
    try:
        asyncio.run(test_qa_validate_and_autofix_success())
        print("✅ QA API Rotaları Entegrasyon Testi Başarısıyla Geçti!")
    except Exception as e:
        print(f"❌ QA API Rotaları Entegrasyon Testi Başarısız: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
