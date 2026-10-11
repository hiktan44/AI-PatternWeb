"""Uygulama konfigürasyonu — tüm env değişkenleri buradan yönetilir"""
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://patternweb:password@localhost:5432/patternweb"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: SecretStr
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440

    # AI
    VERTEX_API_KEY: str = ""
    VERTEX_MODEL: str = "gemini-3.5-flash"
    VERTEX_FALLBACK_MODEL: str = "gemini-2.5-flash"
    VERTEX_THINKING_LEVEL: str = "low"       # low | medium | high
    VERTEX_MEDIA_RESOLUTION: str = "medium"  # low | medium | high

    # Payment
    IYZICO_API_KEY: str = ""
    IYZICO_SECRET_KEY: str = ""
    IYZICO_BASE_URL: str = "https://sandbox-api.iyzipay.com"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # App
    ENVIRONMENT: str = "production"
    TRUSTED_HOSTS: str = "localhost,127.0.0.1"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    FRONTEND_URL: str = "http://localhost:3000"

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Webhooks
    ZAPIER_WEBHOOK_URL: str = ""
    N8N_WEBHOOK_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="allow", hide_input_in_errors=True)

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if (len(secret.encode()) < 32 or len(set(secret)) < 8 or
                secret.lower().startswith(("change-", "your-", "example-", "development-", "test-secret"))):
            raise ValueError("JWT_SECRET için güçlü, en az 32 baytlık ayrı bir sır gerekiyor")
        return value

    @field_validator("TRUSTED_HOSTS")
    @classmethod
    def validate_trusted_hosts(cls, value: str) -> str:
        hosts = [host.strip() for host in value.split(",") if host.strip()]
        if not hosts or "*" in hosts:
            raise ValueError("TRUSTED_HOSTS boş olamaz ve genel joker içeremez")
        return ",".join(hosts)


settings = Settings()
