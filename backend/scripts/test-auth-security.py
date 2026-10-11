"""Yalnız ayrı, kurgusal yerel PostgreSQL veritabanında çalışır."""
import os
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
database_url = os.environ.get("AIPATTERN_TEST_DATABASE_URL", "")
database = urlparse(database_url)
if (database.scheme != "postgresql" or database.hostname != "127.0.0.1" or
        not database.path.startswith("/codex_aipattern_auth_") or not database.port):
    raise SystemExit("Yalnız codex_aipattern_auth_ önekli ayrı yerel test veritabanı kullanılabilir")
fixture_secret = "kurgusal-A7q2Z9m4H6v8D3r5T1y0W2n4B6x8C3s5P9u7L1e"
test_environment = {
    "PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf-8",
    "DATABASE_URL": database_url, "JWT_SECRET": fixture_secret,
    "GOOGLE_CLIENT_ID": "kurgusal-web-client.apps.googleusercontent.com",
    "ENVIRONMENT": "test", "TRUSTED_HOSTS": "localhost,127.0.0.1,fixture.example",
    "ALLOWED_ORIGINS": "https://fixture.example", "VERTEX_API_KEY": "",
    "IYZICO_API_KEY": "", "IYZICO_SECRET_KEY": "", "SMTP_HOST": "",
    "GOOGLE_CLIENT_SECRET": "", "ZAPIER_WEBHOOK_URL": "", "N8N_WEBHOOK_URL": "",
}
os.environ.clear()
os.environ.update(test_environment)
sys.path.insert(0, str(root))
sys.path.insert(0, str(root / "tests"))

original_connect = socket.socket.connect
original_connect_ex = socket.socket.connect_ex
def guard_address(address):
    if not isinstance(address, tuple) or address[:2] != ("127.0.0.1", database.port):
        raise RuntimeError("Test sırasında dış ağ bağlantısı engellendi")
def guarded_connect(connection, address):
    guard_address(address)
    return original_connect(connection, address)
def guarded_connect_ex(connection, address):
    guard_address(address)
    return original_connect_ex(connection, address)
def blocked_sendto(*args, **kwargs):
    raise RuntimeError("Test sırasında UDP/dış ağ bağlantısı engellendi")
socket.socket.connect = guarded_connect
socket.socket.connect_ex = guarded_connect_ex
socket.socket.sendto = blocked_sendto

with tempfile.TemporaryDirectory(prefix="codex_aipattern_auth_") as directory:
    os.chdir(directory)  # Kullanıcının .env dosyasını okumaz.
    os.environ["UPLOAD_DIR"] = str(Path(directory) / "uploads")
    suite = unittest.defaultTestLoader.discover(str(root / "tests"), pattern="test_auth_security.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.wasSuccessful():
        import test_calibration
        for name in sorted(dir(test_calibration)):
            if name.startswith("test_"):
                getattr(test_calibration, name)()
        print("Mevcut dört kalibrasyon testi de geçti; gerçek sağlayıcı çağrısı yapılmadı.")
    raise SystemExit(0 if result.wasSuccessful() else 1)
