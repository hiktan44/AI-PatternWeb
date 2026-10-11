"""Google kimliğini gerçek SDK ile doğrula; e-posta yerine kalıcı subject kullan."""
from dataclasses import dataclass

import requests
from fastapi import HTTPException
from google.auth import exceptions as google_errors
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

from app.core.config import settings


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    name: str
    authoritative_email: bool


def _certificate_session():
    return requests.Session()


def verify_google_identity(token: str) -> GoogleIdentity:
    audience = settings.GOOGLE_CLIENT_ID.strip()
    if not audience:
        raise HTTPException(status_code=503, detail="Google girişi şu anda kullanılamıyor")
    try:
        with _certificate_session() as session:
            request = GoogleRequest(session=session)
            def certificate_request(url, **kwargs):
                kwargs["timeout"] = 5
                return request(url, **kwargs)
            claims = id_token.verify_oauth2_token(token, certificate_request, audience=audience)
    except google_errors.TransportError:
        raise HTTPException(status_code=502, detail="Google doğrulama hizmetine ulaşılamadı") from None
    except (ValueError, TypeError, KeyError, google_errors.GoogleAuthError):
        raise HTTPException(status_code=401, detail="Google kimliği doğrulanamadı") from None
    subject, email = claims.get("sub"), claims.get("email")
    if (not isinstance(subject, str) or not subject or subject.strip() != subject or len(subject) > 255 or
            not isinstance(email, str) or len(email) > 254 or claims.get("email_verified") is not True):
        raise HTTPException(status_code=401, detail="Doğrulanmış Google kimliği ve e-posta gerekiyor")
    email = email.strip().lower()
    if email.count("@") != 1 or not email.split("@")[0] or not email.split("@")[1] or any(char.isspace() for char in email):
        raise HTTPException(status_code=401, detail="Google e-posta bilgisi geçersiz")
    hosted_domain = claims.get("hd")
    authoritative = email.endswith("@gmail.com") or (
        isinstance(hosted_domain, str) and bool(hosted_domain) and email.split("@")[1] == hosted_domain.lower()
    )
    name = claims.get("name") or claims.get("given_name") or "Kullanıcı"
    return GoogleIdentity(subject, email, str(name)[:255], authoritative)
