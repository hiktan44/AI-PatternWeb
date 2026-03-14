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
Frontend: http://localhost:3000
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

- JWT authentication (bcrypt hash)
- Rate limiting hazır
- CORS kısıtlı origin
- Input validation (Pydantic)
- Dosya tipi/boyut kontrolü
- KVKK uyumlu gizlilik politikası

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, TypeScript, Zustand, CSS Modules
- **Backend:** FastAPI, SQLAlchemy (async), Alembic, Pydantic
- **AI:** Google Gemini 2.0 Flash
- **Geometri:** Shapely, ezdxf
- **DB:** PostgreSQL 15 + Redis 7
- **Deploy:** Docker, Coolify

## 📄 Lisans

MIT
