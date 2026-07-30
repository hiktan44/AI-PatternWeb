# AI-PatternWeb

AI destekli, kural tabanlı, üretim güvenli web-based pattern engineering platformu.

## 🏗️ Mimari

```
AI-PatternWeb/
├── frontend/          Next.js 16 + TypeScript + Zustand
│   ├── src/app/       12 sayfa (App Router)
│   └── Dockerfile     Multi-stage standalone build
├── backend/           FastAPI + SQLAlchemy + Alembic
│   ├── app/api/       Auth, Projects, Patterns API
│   ├── app/services/  AI Analysis, Geometry, QA, Export
│   └── Dockerfile     Python 3.11 + health check
├── docker-compose.yml PostgreSQL + Redis + Frontend + Backend
└── .env.example       Tüm environment variable şablonu
```

## 🚀 Hızlı Başlangıç

### Docker ile (Önerilen)
```bash
cp .env.example .env
# .env dosyasında JWT_SECRET ve GEMINI_API_KEY'i güncelleyin
docker compose up -d
```
Frontend: http://localhost:3001
Backend: http://localhost:8000
API Docs: http://localhost:8000/docs

### Lokal Geliştirme
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3001

## 📋 Özellikler

| Sprint | Özellik | Durum |
|--------|---------|-------|
| 1 | Landing Page + Auth + Proje CRUD | ✅ |
| 2 | Dashboard + Dosya Yükleme + AI Analiz | ✅ |
| 3 | Kalıp Editör + Geometri Motoru | ✅ |
| 4 | Dikiş Payı + Serileme (Grading) | ✅ |
| 5 | Pastal/Marker + QA Validation | ✅ |
| 6 | DXF/PDF Export + Fiyatlandırma | ✅ |

## 🔐 Güvenlik

- JWT authentication (bcrypt hash, otomatik expiration)
- **Rate limiting:** 100 istek/15dk pencere (IP bazlı)
- **Login brute-force koruması:** 5 başarısız deneme → 15dk kilitleme
- **CORS kısıtlı origin** — `ALLOWED_ORIGINS` env'den okunur, `*` kullanılmaz
- **Security headers:** X-Frame-Options, X-XSS-Protection, HSTS, Referrer-Policy
- **Input validation:** UUID format kontrolü, email regex, şifre uzunluk kontrolü
- **Global error handler:** Yakalanmamış hatalar loglanır, kullanıcıya minimal bilgi
- **Dosya tipi/boyut kontrolü:** Whitelist + max MB limiti
- **Request logging:** 1s+ süren yavaş istekler uyarı loglanır
- KVKK uyumlu gizlilik politikası

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, TypeScript, Zustand, CSS Modules
- **Backend:** FastAPI, SQLAlchemy (async), Alembic, Pydantic
- **AI:** Gemini 3.1 Flash / Pro (fallback)
- **Geometri:** Shapely, ezdxf
- **DB:** PostgreSQL 15 + Redis 7
- **Deploy:** Docker, Coolify (self-hosting)

## 🔧 Environment Variables

```bash
cp backend/.env.example backend/.env
```

Detaylar için `backend/.env.example` dosyasına bakın.

## 📊 Monitoring

- **Health check:** `GET /health` → `{ status, timestamp, uptime }`
- **Rate limit headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **Slow request logging:** 1000ms+ → warning log

## ☁️ Coolify Deployment (Self-Hosting) Rehberi

AI-PatternWeb platformunu Coolify ile kendi sunucunuzda tek tıkla barındırmak için aşağıdaki adımları izleyin:

### 1. Veritabanı ve Redis Kurulumu
1. Coolify panelinizden **New Resource** → **Databases** → **PostgreSQL** seçerek yeni bir veritabanı oluşturun.
2. **New Resource** → **Databases** → **Redis** seçerek bir Redis önbellek servisi oluşturun.
3. Oluşturulan servislerin dahili (internal) bağlantı URL'lerini not edin.

### 2. Backend (FastAPI) Dağıtımı
1. Coolify'da **New Application** seçin ve GitHub deponuzu bağlayın.
2. **Dizin (Base Directory):** `/backend` olarak ayarlayın.
3. **Build Pack:** `Dockerfile` seçin.
4. **Portlar:** `8000:8000` olarak yapılandırın.
5. **Sağlık Kontrolü (Health Check):** `/health` yolunu (path) tanımlayın (Uptime kontrolü için zorunludur).
6. **Ortam Değişkenleri (Environment Variables):**
   * `DATABASE_URL`: PostgreSQL dahili asenkron adresi (`postgresql+asyncpg://...`)
   * `REDIS_URL`: Redis dahili adresi (`redis://...`)
   * `GEMINI_API_KEY`: Google Gemini API anahtarınız
   * `JWT_SECRET`: Güçlü bir gizli anahtar
   * `ALLOWED_ORIGINS`: Frontend URL adresiniz (örn: `https://aipatternweb.com`)

### 3. Frontend (Next.js) Dağıtımı
1. Coolify'da tekrar **New Application** diyerek aynı repoyu bağlayın.
2. **Dizin (Base Directory):** `/frontend` olarak ayarlayın.
3. **Build Pack:** `Dockerfile` seçin.
4. **Portlar:** `3000:3000` olarak yapılandırın.
5. **Ortam Değişkenleri (Environment Variables):**
    * `NEXT_PUBLIC_BACKEND_URL`: Üretimdeki Backend URL'niz (örn: `https://api.aipatternweb.com`). Bu değer Next.js build-time sırasında statik olarak derlenecektir.

---

## 📄 Lisans

