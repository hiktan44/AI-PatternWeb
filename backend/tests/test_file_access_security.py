"""İki kurgusal kullanıcıyla gerçek PostgreSQL/HTTP/disk sahiplik testleri."""
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch
from urllib.parse import urlparse
import uuid

database = urlparse(os.environ.get("DATABASE_URL", ""))
if (database.scheme != "postgresql" or database.hostname != "127.0.0.1" or
        not database.path.startswith("/codex_aipattern_auth_") or not database.port):
    raise RuntimeError("Yalnız ayrı yerel deneme veritabanı kullanılabilir")

import httpx
from sqlalchemy import select, text
from app.core.database import Base, async_session, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.project import Project, ProjectFile
from app.models.user import User

class FileAccessTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="codex_aipattern_files_")
        self.disk = Path(self.directory.name)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(text("TRUNCATE audit_logs, project_files, projects, users CASCADE"))
        password_hash = hash_password("kurgusal-dosya-parolasi")
        async with async_session() as session:
            self.owner = User(email="owner@example.org", name="Kurgusal Sahip", password_hash=password_hash, credits=10)
            self.other = User(email="other@example.org", name="Kurgusal Diğer", password_hash=password_hash, credits=10)
            session.add_all([self.owner, self.other])
            await session.flush()
            self.project = Project(user_id=self.owner.id, name="Kurgusal Proje", category="tshirt")
            self.second_project = Project(user_id=self.owner.id, name="İkinci Kurgusal Proje", category="tshirt")
            self.foreign_project = Project(user_id=self.other.id, name="Başka Kurgusal Proje", category="tshirt")
            session.add_all([self.project, self.second_project, self.foreign_project])
            await session.flush()
            self.files = []
            for index, project in enumerate([self.project, self.second_project, self.foreign_project]):
                path = self.disk / f"kurgusal-{index}.png"
                path.write_bytes(f"kurgusal-dosya-{index}".encode())
                file = ProjectFile(project_id=project.id, filename=path.name, file_type="image/png", file_path=str(path),
                    file_size=path.stat().st_size, analysis_result={"fixture": index}, confidence_score=0.7)
                session.add(file)
                self.files.append(file)
            await session.commit()
        self.file, self.second_file, self.foreign_file = self.files
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://fixture.example",
            headers={"Authorization": "Bearer " + create_access_token({"sub": self.owner.id})})
        self.analysis = AsyncMock(return_value={"status": "success", "confidence": 0.7, "pieces": {}})
        self.generation = AsyncMock(return_value={"garment_type": "tshirt", "pieces": {"kurgusal": {"coords": [[0,0],[10,0],[10,10],[0,0]]}}})
        self.patches = [patch("app.api.patterns.analyze_image", self.analysis),
            patch("app.api.patterns.generate_pattern_with_analysis", self.generation),
            patch("app.api.patterns.generate_pattern_from_image", self.generation)]
        for active in self.patches:
            active.start()
    async def asyncTearDown(self):
        for active in reversed(self.patches):
            active.stop()
        await self.client.aclose()
        await engine.dispose()
        self.directory.cleanup()
    async def snapshot(self):
        async with async_session() as session:
            files = (await session.execute(select(ProjectFile.id, ProjectFile.project_id, ProjectFile.analysis_result,
                ProjectFile.confidence_score, ProjectFile.file_path).order_by(ProjectFile.id))).all()
            users = (await session.execute(select(User.id, User.credits).order_by(User.id))).all()
            projects = (await session.execute(select(Project.id, Project.category, Project.target_sizes, Project.base_size).order_by(Project.id))).all()
            return files, users, projects
    async def assert_denied_without_work(self, response, before, expected=404):
        self.assertEqual(response.status_code, expected)
        self.assertEqual(await self.snapshot(), before)
        self.analysis.assert_not_awaited()
        self.generation.assert_not_awaited()
        self.assertNotIn("kurgusal-dosya-2", response.text)
        self.assertNotIn(self.foreign_file.file_path, response.text)

    async def test_foreign_project_file_list_denied(self):
        before = await self.snapshot()
        response = await self.client.get(f"/api/projects/{self.foreign_project.id}/files")
        await self.assert_denied_without_work(response, before)
    async def test_foreign_download_denied_before_disk_lookup(self):
        before = await self.snapshot()
        with patch("app.api.projects.os.path.exists") as disk_lookup:
            response = await self.client.get(f"/api/projects/{self.foreign_project.id}/files/{self.foreign_file.id}/download")
        disk_lookup.assert_not_called()
        await self.assert_denied_without_work(response, before)
    async def test_download_project_file_pair_must_match(self):
        before = await self.snapshot()
        response = await self.client.get(f"/api/projects/{self.project.id}/files/{self.second_file.id}/download")
        await self.assert_denied_without_work(response, before)
    async def test_unknown_project_list_is_not_an_empty_success(self):
        before = await self.snapshot()
        response = await self.client.get(f"/api/projects/{uuid.uuid4()}/files")
        await self.assert_denied_without_work(response, before)
    async def test_owner_lists_only_own_project_files(self):
        response = await self.client.get(f"/api/projects/{self.project.id}/files")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [self.file.id])
    async def test_owner_downloads_exact_fixture_bytes(self):
        response = await self.client.get(f"/api/projects/{self.project.id}/files/{self.file.id}/download")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"kurgusal-dosya-0")
        self.assertIn(self.file.filename, response.headers["Content-Disposition"])
    async def test_anonymous_cannot_list_or_download(self):
        before = await self.snapshot()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://fixture.example") as client:
            for path in [f"/api/projects/{self.project.id}/files", f"/api/projects/{self.project.id}/files/{self.file.id}/download"]:
                response = await client.get(path)
                await self.assert_denied_without_work(response, before, 403)
    async def test_analyze_foreign_file_under_own_project_denied(self):
        before = await self.snapshot()
        response = await self.client.post("/api/patterns/analyze", json={"project_id": self.project.id, "file_id": self.foreign_file.id})
        await self.assert_denied_without_work(response, before)
    async def test_analyze_other_owned_project_file_denied(self):
        before = await self.snapshot()
        response = await self.client.post("/api/patterns/analyze", json={"project_id": self.project.id, "file_id": self.second_file.id})
        await self.assert_denied_without_work(response, before)
    async def test_analyze_foreign_project_denied(self):
        before = await self.snapshot()
        response = await self.client.post("/api/patterns/analyze", json={"project_id": self.foreign_project.id, "file_id": self.foreign_file.id})
        await self.assert_denied_without_work(response, before)
    async def test_generate_foreign_file_denied_before_disk_or_provider(self):
        before = await self.snapshot()
        with patch("app.api.patterns.os.path.exists") as disk_lookup:
            response = await self.client.post("/api/patterns/generate-pattern", json={"project_id": self.project.id, "file_id": self.foreign_file.id})
        disk_lookup.assert_not_called()
        await self.assert_denied_without_work(response, before)
    async def test_generate_other_owned_project_file_denied(self):
        before = await self.snapshot()
        response = await self.client.post("/api/patterns/generate-pattern", json={"project_id": self.project.id, "file_id": self.second_file.id})
        await self.assert_denied_without_work(response, before)
    async def test_generate_foreign_project_denied_even_without_file(self):
        before = await self.snapshot()
        response = await self.client.post("/api/patterns/generate-pattern", json={"project_id": self.foreign_project.id})
        await self.assert_denied_without_work(response, before)
    async def test_missing_explicit_file_is_rejected_without_fallback(self):
        before = await self.snapshot()
        response = await self.client.post("/api/patterns/generate-pattern", json={"project_id": self.project.id, "file_id": str(uuid.uuid4())})
        await self.assert_denied_without_work(response, before)
    async def test_invalid_identifiers_are_rejected(self):
        before = await self.snapshot()
        cases = [("get", "/api/projects/gecersiz/files", None),
            ("get", f"/api/projects/{self.project.id}/files/gecersiz/download", None),
            ("post", "/api/patterns/analyze", {"project_id": self.project.id, "file_id": "gecersiz"}),
            ("post", "/api/patterns/generate-pattern", {"project_id": "gecersiz", "file_id": self.file.id})]
        for method, path, body in cases:
            response = await self.client.request(method, path, **({"json": body} if body is not None else {}))
            await self.assert_denied_without_work(response, before, 400)
    async def test_owner_analyzes_only_selected_owned_file(self):
        response = await self.client.post("/api/patterns/analyze", json={"project_id": self.project.id, "file_id": self.file.id})
        self.assertEqual(response.status_code, 200)
        self.analysis.assert_awaited_once_with(self.file.file_path)
        async with async_session() as session:
            own = await session.get(ProjectFile, self.file.id)
            foreign = await session.get(ProjectFile, self.foreign_file.id)
            self.assertEqual(own.analysis_result, self.analysis.return_value)
            self.assertEqual(foreign.analysis_result, {"fixture": 2})
            self.assertEqual((await session.get(User, self.owner.id)).credits, 9)
            self.assertEqual((await session.get(User, self.other.id)).credits, 10)
    async def test_owner_generates_only_selected_owned_file(self):
        response = await self.client.post("/api/patterns/generate-pattern", json={"project_id": self.project.id, "file_id": self.file.id})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ai_generated"])
        self.generation.assert_awaited_once()
        self.assertEqual(self.generation.await_args.args[0], self.file.file_path)
        async with async_session() as session:
            self.assertIsNone((await session.get(Project, self.foreign_project.id)).target_sizes)

if __name__ == "__main__":
    raise SystemExit("scripts/test-auth-security.py çalıştırıcısını kullanın")
