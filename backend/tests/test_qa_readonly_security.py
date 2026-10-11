"""QA GET gerçek PostgreSQL üzerinde örnek sonuç/kredi/dosya yazamaz."""
import copy
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, patch
from urllib.parse import urlparse
import uuid

database = urlparse(os.environ.get("DATABASE_URL", ""))
if (database.hostname != "127.0.0.1" or not database.path.startswith("/codex_aipattern_auth_") or not database.port):
    raise RuntimeError("Yalnız ayrı yerel kurgusal veritabanı kullanılabilir")

import httpx
from sqlalchemy import event, select, text
from sqlalchemy.orm import Session
from app.core.database import Base, async_session, engine
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.project import AuditLog, Project, ProjectFile
from app.models.user import User
from app.services.qa_validation import run_qa_validation

GEOMETRY = {"status": "success", "confidence": 0.72, "pieces": {
    "kurgusal_on": {"coords": [[0,0],[80,0],[80,120],[0,120],[0,0]], "name": "Kurgusal ön parça"}
}}

class ReadonlyQATests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(text("TRUNCATE audit_logs, project_files, projects, users CASCADE"))
        async with async_session() as session:
            self.user = User(email="qa@example.org", name="Kurgusal QA", password_hash=hash_password("kurgusal-qa-parolasi"), credits=11)
            session.add(self.user)
            await session.flush()
            self.project = Project(user_id=self.user.id, name="Kurgusal QA Projesi", category="tshirt")
            session.add(self.project)
            await session.commit()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://fixture.example",
            headers={"Authorization": "Bearer "+create_access_token({"sub":self.user.id})})
        self.event = AsyncMock()
        self.patch = patch("app.api.projects.trigger_qa_failed_event",self.event)
        self.patch.start()
    async def asyncTearDown(self):
        self.patch.stop()
        await self.client.aclose()
        await engine.dispose()
    async def add_file(self, analysis=None, **changes):
        file = ProjectFile(project_id=self.project.id, filename="kurgusal-kalip.png",file_type="image/png",
            file_path="kurgusal-kalip.png",file_size=5,analysis_result=copy.deepcopy(analysis),confidence_score=0.21)
        for name,value in changes.items():setattr(file,name,value)
        async with async_session() as session:
            session.add(file)
            await session.commit()
        return file
    async def snapshot(self):
        async with async_session() as session:
            files = (await session.execute(select(ProjectFile.id,ProjectFile.analysis_result,ProjectFile.confidence_score,ProjectFile.file_path).order_by(ProjectFile.id))).all()
            users = (await session.execute(select(User.id,User.credits,User.updated_at).order_by(User.id))).all()
            audits = (await session.execute(select(AuditLog.id).order_by(AuditLog.id))).all()
            return files,users,audits
    async def get_readonly(self,expected,project_id=None):
        before=await self.snapshot()
        statements,commits=[],[]
        def record_statement(conn,cursor,statement,parameters,context,executemany):statements.append(statement)
        def record_commit(session):commits.append(True)
        event.listen(engine.sync_engine,"before_cursor_execute",record_statement)
        event.listen(Session,"after_commit",record_commit)
        try:
            response=await self.client.get(f"/api/projects/{project_id or self.project.id}/qa-validate")
        finally:
            event.remove(engine.sync_engine,"before_cursor_execute",record_statement)
            event.remove(Session,"after_commit",record_commit)
        self.assertEqual(response.status_code,expected)
        self.assertEqual(await self.snapshot(),before)
        self.assertEqual(commits,[])
        self.assertTrue(statements and all(sql.lstrip().upper().startswith("SELECT") for sql in statements))
        self.event.assert_not_awaited()
        return response
    async def test_empty_project_never_creates_demo(self):
        response=await self.get_readonly(409)
        self.assertIn("gerçek kalıp",response.json()["detail"])
    async def test_unanalyzed_file_stays_unanalyzed(self):
        await self.add_file()
        await self.get_readonly(409)
    async def test_empty_analysis_does_not_gain_confidence(self):
        await self.add_file({})
        await self.get_readonly(409)
    async def test_marked_demo_cannot_pass_as_real_qa(self):
        await self.add_file(dict(GEOMETRY,demo_mode=True))
        await self.get_readonly(409)
    async def test_legacy_demo_file_rejected_without_cleanup(self):
        await self.add_file(GEOMETRY,filename="demo_pattern.png",file_path="uploads/demo_pattern.png")
        await self.get_readonly(409)
    async def test_provider_error_is_not_quality_approval(self):
        await self.add_file({"error":"kurgusal-hata","pieces":GEOMETRY["pieces"]})
        await self.get_readonly(409)
    async def test_no_pieces_not_quality_approval(self):
        await self.add_file({"status":"success","measurements":{"chest":100}})
        await self.get_readonly(409)
    async def test_invalid_piece_shape_is_explicit(self):
        await self.add_file({"pieces":["gecersiz-parca"]})
        await self.get_readonly(409)
    async def test_piece_without_coordinates_cannot_pass(self):
        await self.add_file({"pieces":{"missing":{"name":"Kurgusal"}}})
        await self.get_readonly(409)
    async def test_scalar_coordinates_are_rejected(self):
        await self.add_file({"pieces":{"bad":{"coords":1}}})
        await self.get_readonly(409)
    async def test_non_numeric_coordinates_are_rejected(self):
        await self.add_file({"pieces":{"bad":{"coords":[[0,0],["hata",10],[10,0],[0,0]]}}})
        await self.get_readonly(409)
    async def test_valid_dictionary_geometry_matches_actual_validator(self):
        await self.add_file(GEOMETRY)
        response=await self.get_readonly(200)
        pieces=[dict(piece,name=piece.get("name",name))for name,piece in GEOMETRY["pieces"].items()]
        self.assertEqual(response.json(),run_qa_validation(pieces,{"category":"tshirt"}))
    async def test_list_geometry_works_without_mutation(self):
        await self.add_file({"pieces":[GEOMETRY["pieces"]["kurgusal_on"]]})
        await self.get_readonly(200)
    async def test_newest_invalid_analysis_does_not_reuse_old_approval(self):
        await self.add_file(GEOMETRY,created_at=datetime.now(timezone.utc)-timedelta(days=1))
        await self.add_file(dict(GEOMETRY,demo_mode=True),created_at=datetime.now(timezone.utc))
        await self.get_readonly(409)
    async def test_repeated_get_and_low_quality_never_send_webhook(self):
        invalid={"pieces":{"broken":{"coords":[[0,0],[100,100],[0,100],[100,0],[0,0]]}}}
        await self.add_file(invalid)
        for _ in range(3):
            response=await self.get_readonly(200)
            self.assertEqual(response.json()["status"],"FAILED")
            self.assertLess(response.json()["score"],80)
    async def test_foreign_user_and_unknown_project_cannot_read_qa(self):
        await self.add_file(GEOMETRY)
        async with async_session() as session:
            other=User(email="other-qa@example.org",name="Kurgusal",password_hash=self.user.password_hash)
            session.add(other)
            await session.commit()
        self.client.headers["Authorization"]="Bearer "+create_access_token({"sub":other.id})
        await self.get_readonly(404)
        await self.get_readonly(404,str(uuid.uuid4()))

if __name__=="__main__":
    raise SystemExit("scripts/test-auth-security.py çalıştırıcısını kullanın")
