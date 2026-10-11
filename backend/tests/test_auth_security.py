"""Gerçek Google SDK/kripto, FastAPI, JWT ve PostgreSQL güvenlik testleri."""
import asyncio
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import time
import unittest
from unittest.mock import patch
from urllib.parse import urlparse

fixture_database = urlparse(os.environ.get("DATABASE_URL", ""))
if (fixture_database.scheme != "postgresql" or fixture_database.hostname != "127.0.0.1" or
        not fixture_database.path.startswith("/codex_aipattern_auth_") or not fixture_database.port):
    raise RuntimeError("Bu testler yalnız ayrı yerel codex_aipattern_auth_ veritabanında çalışır")

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import httpx
from jose import jwt
from pydantic import ValidationError
import requests
from requests.adapters import BaseAdapter
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, settings
from app.core.database import Base, async_session, engine
from app.core.security import create_access_token, hash_password
from app.main import app, lifespan
from app.models.user import User

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
KEY_PEM = KEY.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
OTHER_KEY_PEM = OTHER_KEY.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Kurgusal Google test sertifikası")])
CERTIFICATE = (x509.CertificateBuilder().subject_name(subject).issuer_name(subject)
    .public_key(KEY.public_key()).serial_number(x509.random_serial_number())
    .not_valid_before(datetime.now(timezone.utc) - timedelta(days=1))
    .not_valid_after(datetime.now(timezone.utc) + timedelta(days=1)).sign(KEY, hashes.SHA256())
    .public_bytes(serialization.Encoding.PEM).decode())
KID = "kurgusal-key"
CERT_URL = "https://www.googleapis.com/oauth2/v1/certs"

def signed_token(**overrides):
    claims = {"iss": "https://accounts.google.com", "aud": settings.GOOGLE_CLIENT_ID,
        "sub": "kurgusal-subject-1", "email": "kurgusal1@gmail.com", "email_verified": True,
        "name": "Kurgusal Kullanıcı", "iat": int(time.time()) - 10, "exp": int(time.time()) + 600}
    claims.update(overrides)
    claims = {key: value for key, value in claims.items() if value is not None}
    return jwt.encode(claims, KEY_PEM, algorithm="RS256", headers={"kid": KID})

class CertificateAdapter(BaseAdapter):
    """Yalnız sertifika HTTP taşımasını değiştirir; doğrulayıcı taklit edilmez."""
    def __init__(self, requests_seen, mode):
        self.requests_seen, self.mode = requests_seen, mode
    def send(self, request, **kwargs):
        assert request.url == CERT_URL and request.method == "GET"
        assert not request.body and not request.headers.get("Authorization")
        assert kwargs["timeout"] == 5
        self.requests_seen.append(request.url)
        if self.mode == "timeout":
            raise requests.Timeout("kurgusal taşıma zaman aşımı")
        response = requests.Response()
        response.status_code = 200
        response._content = json.dumps({KID: CERTIFICATE}).encode()
        response.headers["Content-Type"] = "application/json"
        return response
    def close(self):
        pass

class AuthSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.cert_requests, self.cert_sessions, self.mode = [], [], "ok"
        def certificate_session():
            session = requests.Session()
            session.mount("https://", CertificateAdapter(self.cert_requests, self.mode))
            self.cert_sessions.append(session)
            return session
        self.transport_patch = patch("app.core.google_identity._certificate_session", certificate_session)
        self.transport_patch.start()
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(text("TRUNCATE public.audit_logs, public.project_files, public.projects, public.users CASCADE"))
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://fixture.example")
    async def asyncTearDown(self):
        await self.client.aclose()
        self.transport_patch.stop()
        await engine.dispose()
    async def login(self, token=None, **body):
        return await self.client.post("/api/auth/google", json={"token": token or signed_token(), **body})
    async def user_count(self):
        async with async_session() as session:
            return await session.scalar(select(func.count()).select_from(User))
    async def existing_user(self, **changes):
        user = User(email="kurgusal1@gmail.com", name="Kurgusal Eski Hesap", password_hash=hash_password("kurgusal-Parola-9!"),
            credits=17, email_verified=True, **changes)
        async with async_session() as session:
            session.add(user)
            await session.commit()
        return user
    async def rejected_token(self, **claims):
        token = signed_token(**claims)
        response = await self.login(token)
        self.assertEqual(response.status_code, 401)
        self.assertNotIn(token, response.text)
        self.assertNotIn("access_token", response.json())
        self.assertEqual(await self.user_count(), 0)

    async def test_valid_signature_login_jwt_and_me(self):
        response = await self.login()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user"]["credits"], 50)
        self.assertNotIn("google_sub", data["user"])
        payload = jwt.decode(data["access_token"], settings.JWT_SECRET.get_secret_value(), algorithms=["HS256"])
        self.assertEqual(payload["sub"], data["user"]["id"])
        me = await self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + data["access_token"]})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["id"], payload["sub"])
        self.assertEqual(self.cert_requests, [CERT_URL])
    async def test_wrong_audience(self):
        await self.rejected_token(aud="baska-uygulama.apps.googleusercontent.com")
    async def test_wrong_issuer(self):
        await self.rejected_token(iss="https://yanlis-issuer.example")
    async def test_missing_issuer(self):
        await self.rejected_token(iss=None)
    async def test_expired_token(self):
        await self.rejected_token(iat=int(time.time())-900, exp=int(time.time())-300)
    async def test_future_issued_token(self):
        await self.rejected_token(iat=int(time.time())+300)
    async def test_missing_expiry(self):
        await self.rejected_token(exp=None)
    async def test_invalid_time_type(self):
        await self.rejected_token(exp="yanlis-zaman")
    async def test_wrong_signature(self):
        bad = jwt.encode({"iss": "https://accounts.google.com", "aud": settings.GOOGLE_CLIENT_ID,
            "iat": int(time.time())-10, "exp": int(time.time())+60, "sub": "yanlis-key",
            "email": "yanlis-key@gmail.com", "email_verified": True}, OTHER_KEY_PEM, algorithm="RS256", headers={"kid": KID})
        response = await self.login(bad)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(await self.user_count(), 0)
    async def test_malformed_token(self):
        response = await self.login("kurgusal-bozuk-token")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(await self.user_count(), 0)
    async def test_unverified_email(self):
        await self.rejected_token(email_verified=False)
    async def test_string_email_verification_is_rejected(self):
        await self.rejected_token(email_verified="true")
    async def test_missing_subject(self):
        await self.rejected_token(sub=None)
    async def test_invalid_email(self):
        await self.rejected_token(email="gecersiz email@gmail.com")
    async def test_missing_client_id_closed(self):
        with patch.object(settings, "GOOGLE_CLIENT_ID", ""):
            response = await self.login()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(self.cert_requests, [])
        self.assertEqual(await self.user_count(), 0)
    async def test_access_token_bypass_closed(self):
        response = await self.login(is_access_token=True)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.cert_requests, [])
        self.assertEqual(await self.user_count(), 0)
    async def test_bounded_token_request(self):
        for token in ("", "x" * 16385):
            response = await self.client.post("/api/auth/google", json={"token": token})
            self.assertEqual(response.status_code, 422)
        self.assertEqual(self.cert_requests, [])
    async def test_certificate_service_failure_no_account(self):
        self.mode = "timeout"
        response = await self.login()
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("kurgusal taşıma", response.text)
        self.assertEqual(await self.user_count(), 0)
    async def test_subject_stable_when_email_changes(self):
        first = await self.login()
        async with async_session() as session:
            user = await session.get(User, first.json()["user"]["id"])
            trial = user.trial_ends_at
            user.credits = 13
            await session.commit()
        second = await self.login(signed_token(email="degisen@example.org"))
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["user"]["id"], first.json()["user"]["id"])
        self.assertEqual(second.json()["user"]["credits"], 13)
        self.assertEqual(second.json()["user"]["email"], "kurgusal1@gmail.com")
        self.assertEqual(await self.user_count(), 1)
        async with async_session() as session:
            user = await session.get(User, first.json()["user"]["id"])
            self.assertEqual(user.trial_ends_at, trial)
    async def test_verified_legacy_gmail_links_once(self):
        old = await self.existing_user()
        response = await self.login()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], old.id)
        self.assertEqual(response.json()["user"]["credits"], 17)
        async with async_session() as session:
            stored = await session.get(User, old.id)
            self.assertEqual(stored.google_sub, "kurgusal-subject-1")
            self.assertEqual(stored.password_hash, old.password_hash)
            self.assertIsNone(stored.trial_ends_at)
    async def test_unverified_local_account_cannot_be_claimed(self):
        old = await self.existing_user()
        async with async_session() as session:
            stored = await session.get(User, old.id)
            stored.email_verified = False
            await session.commit()
        response = await self.login()
        self.assertEqual(response.status_code, 409)
        async with async_session() as session:
            self.assertIsNone((await session.get(User, old.id)).google_sub)
    async def test_external_email_is_not_auto_linked(self):
        old = await self.existing_user()
        async with async_session() as session:
            stored = await session.get(User, old.id)
            stored.email = "kurgusal@example.org"
            await session.commit()
        response = await self.login(signed_token(email="kurgusal@example.org"))
        self.assertEqual(response.status_code, 409)
        async with async_session() as session:
            self.assertIsNone((await session.get(User, old.id)).google_sub)
    async def test_workspace_authoritative_email_links(self):
        old = await self.existing_user()
        async with async_session() as session:
            stored = await session.get(User, old.id)
            stored.email = "kurgusal@example.org"
            await session.commit()
        response = await self.login(signed_token(email="kurgusal@example.org", hd="example.org"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], old.id)
    async def test_mismatched_workspace_domain_does_not_link(self):
        old = await self.existing_user()
        async with async_session() as session:
            stored = await session.get(User, old.id)
            stored.email = "kurgusal@example.org"
            await session.commit()
        response = await self.login(signed_token(email="kurgusal@example.org", hd="baska.example"))
        self.assertEqual(response.status_code, 409)
    async def test_different_subject_cannot_overwrite_link(self):
        old = await self.existing_user(google_sub="baska-subject")
        response = await self.login()
        self.assertEqual(response.status_code, 409)
        async with async_session() as session:
            self.assertEqual((await session.get(User, old.id)).google_sub, "baska-subject")
    async def test_inactive_google_account_rejected(self):
        await self.existing_user(google_sub="kurgusal-subject-1", is_active=False)
        response = await self.login()
        self.assertEqual(response.status_code, 403)
    async def test_inactive_legacy_account_not_linked(self):
        old = await self.existing_user(is_active=False)
        response = await self.login()
        self.assertEqual(response.status_code, 403)
        async with async_session() as session:
            self.assertIsNone((await session.get(User, old.id)).google_sub)
    async def test_app_jwt_rejected_after_deactivation(self):
        response = await self.login()
        async with async_session() as session:
            user = await session.get(User, response.json()["user"]["id"])
            user.is_active = False
            await session.commit()
        response = await self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + response.json()["access_token"]})
        self.assertEqual(response.status_code, 403)
    async def test_concurrent_signup_grants_once(self):
        responses = await asyncio.gather(*(self.login() for _ in range(6)))
        self.assertTrue(all(response.status_code == 200 for response in responses))
        self.assertEqual(len({response.json()["user"]["id"] for response in responses}), 1)
        self.assertEqual(await self.user_count(), 1)
        async with async_session() as session:
            user = await session.scalar(select(User))
            self.assertEqual(user.credits, 50)
            self.assertGreater(user.trial_ends_at, datetime.now(timezone.utc) + timedelta(days=13))
    async def test_concurrent_legacy_link_cannot_overwrite(self):
        old = await self.existing_user()
        responses = await asyncio.gather(self.login(signed_token(sub="subject-a")), self.login(signed_token(sub="subject-b")))
        self.assertEqual(sorted(response.status_code for response in responses), [200, 409])
        async with async_session() as session:
            stored = await session.get(User, old.id)
            self.assertIn(stored.google_sub, {"subject-a", "subject-b"})
            self.assertEqual(stored.credits, 17)
    async def test_unknown_host_rejected_in_production(self):
        with patch.object(settings, "ENVIRONMENT", "production"):
            response = await self.client.get("/openapi.json", headers={"Host": "yabanci.example"})
            self.assertEqual(response.status_code, 400)
            response = await self.client.get("/openapi.json")
            self.assertEqual(response.status_code, 200)
            self.assertIn("Strict-Transport-Security", response.headers)
    async def test_actual_lifespan_creates_only_fixture_tables(self):
        async with lifespan(app):
            response = await self.client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "ok")
        self.assertTrue(Path(settings.UPLOAD_DIR).is_dir())
    async def test_websocket_real_jwt_secret_and_inactive_user(self):
        old = await self.existing_user()
        async with async_session() as session:
            user = await session.get(User, old.id)
            user.credits = 0
            await session.commit()
        async def websocket_messages():
            output = []
            scope = {"type": "websocket", "asgi": {"version": "3.0"}, "scheme": "wss", "path": "/api/patterns/generate-ws",
                "raw_path": b"/api/patterns/generate-ws", "query_string": ("token="+create_access_token({"sub": old.id})).encode(),
                "headers": [(b"host", b"fixture.example")], "client": ("127.0.0.1", 10000), "server": ("fixture.example", 443), "subprotocols": []}
            async def receive():
                return {"type": "websocket.connect"}
            async def send(message):
                output.append(message)
            await app(scope, receive, send)
            return output
        messages = await websocket_messages()
        self.assertEqual(messages[-1], {"type": "websocket.close", "code": 1002, "reason": ""})
        self.assertIn("Yetersiz kredi", messages[1]["text"])
        async with async_session() as session:
            user = await session.get(User, old.id)
            user.is_active = False
            await session.commit()
        messages = await websocket_messages()
        self.assertEqual(messages[-1]["code"], 1008)
        self.assertIn("devre dışı", messages[1]["text"])
    async def test_migration_preserves_legacy_data_and_is_repeatable(self):
        old = await self.existing_user()
        # Yalnız önek doğrulamasından geçmiş test DB'sinde eski şema simülasyonu.
        async with engine.begin() as connection:
            await connection.execute(text("DROP INDEX public.ix_users_google_sub"))
            await connection.execute(text("ALTER TABLE public.users DROP COLUMN google_sub"))
        migration = (Path(__file__).resolve().parents[1] / "migrations/20261012_google_identity.sql").read_text()
        statements = [statement.strip() for statement in migration.split(";") if statement.strip()]
        async with engine.begin() as connection:
            for _ in range(2):
                for statement in statements:
                    # SQL dosyasının BEGIN/COMMIT'i gerçek dış işlemle yönetilir.
                    sql = "\n".join(line for line in statement.splitlines() if not line.strip().startswith("--")).strip()
                    if sql not in ("BEGIN", "COMMIT", ""):
                        await connection.execute(text(sql))
        async with async_session() as session:
            stored = await session.get(User, old.id)
            self.assertEqual(stored.credits, 17)
            self.assertEqual(stored.password_hash, old.password_hash)
            self.assertIsNone(stored.google_sub)
            stored.google_sub = "unique-fixture"
            await session.commit()
        async with async_session() as session:
            duplicate = User(email="duplicate@gmail.com", google_sub="unique-fixture", name="Kurgusal", password_hash=old.password_hash)
            session.add(duplicate)
            with self.assertRaises(IntegrityError):
                await session.commit()
            await session.rollback()
        async with async_session() as session:
            session.add_all([User(email=f"null{i}@gmail.com", name="Kurgusal", password_hash=old.password_hash) for i in range(2)])
            await session.commit()
        self.assertEqual(await self.user_count(), 3)

class ConfigurationTests(unittest.TestCase):
    def test_missing_secret_is_rejected(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(ValidationError):
                Settings(_env_file=None)
    def test_empty_short_placeholder_and_repeated_secrets_rejected_without_leak(self):
        for value in ("", "short", "a"*64, "change-this-in-production", "your-jwt-secret-change-this-production-123456789"):
            with self.subTest(kind=len(value)):
                with self.assertRaises(ValidationError) as caught:
                    Settings(_env_file=None, JWT_SECRET=value)
                if value:
                    self.assertNotIn(value, str(caught.exception))
    def test_strong_secret_masked_in_settings(self):
        config = Settings(_env_file=None)
        self.assertNotIn(config.JWT_SECRET.get_secret_value(), repr(config))
        self.assertEqual(str(config.JWT_SECRET), "**********")
    def test_empty_and_universal_hosts_rejected(self):
        for value in ("", "*", "localhost, *"):
            with self.assertRaises(ValidationError):
                Settings(_env_file=None, TRUSTED_HOSTS=value)
    def test_host_configuration_normalizes_explicit_domains(self):
        config = Settings(_env_file=None, TRUSTED_HOSTS=" localhost, api.fixture.example ,*.fixture.example ")
        self.assertEqual(config.TRUSTED_HOSTS, "localhost,api.fixture.example,*.fixture.example")

if __name__ == "__main__":
    raise SystemExit("Testleri scripts/test-auth-security.py ile ayrı test veritabanında çalıştırın")
