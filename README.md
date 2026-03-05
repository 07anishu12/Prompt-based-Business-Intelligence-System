# Prompt BI

Natural-language Business Intelligence platform. Type prompts like *"Show monthly revenue by region as a bar chart"* and get instant visualizations, tables, and KPI cards — then drag them onto a dashboard canvas.

## Architecture

```
Frontend (React + TypeScript)          Backend (Python / FastAPI)
┌──────────────────────────┐           ┌──────────────────────────┐
│ Prompt Bar → Widgets     │  HTTP/WS  │ Prompt Engine (Claude AI)│
│ Dashboard Canvas (Grid)  │◄────────►│ Query Engine (SQLAlchemy)│
│ Connections / Explore    │           │ Data Connectors          │
└──────────────────────────┘           └──────────┬───────────────┘
                                                  │
                                       ┌──────────┴───────────────┐
                                       │ PostgreSQL │ Redis        │
                                       └──────────────────────────┘
```

**Frontend:** React 18, TypeScript, Tailwind CSS, Recharts, react-grid-layout, Zustand
**Backend:** FastAPI (async), SQLAlchemy 2.0, Claude API (Anthropic), Pandas, DuckDB
**Infrastructure:** PostgreSQL 15, Redis 7, Docker, Nginx

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An [Anthropic API key](https://console.anthropic.com/)

### Production

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and JWT_SECRET

# 2. Launch all services
docker compose up -d

# 3. Run database migrations
docker compose exec backend alembic upgrade head

# App is now running at http://localhost
```

### Development

```bash
# 1. Start infrastructure + backend with hot reload
docker compose -f docker-compose.dev.yml up -d

# 2. Run migrations
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head

# Backend: http://localhost:8000 (auto-reload)
# Frontend: http://localhost:5173 (Vite HMR)
# API docs: http://localhost:8000/docs
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://bi_user:bi_pass@localhost:5432/prompt_bi` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ANTHROPIC_API_KEY` | Claude API key | *(required)* |
| `JWT_SECRET` | Secret for signing JWT tokens | `change-me-in-production` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_EXPIRY_HOURS` | Token expiry in hours | `24` |
| `UPLOAD_DIR` | Directory for uploaded files | `./uploads` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | *(optional)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | *(optional)* |

## Data Sources

| Type | Driver | Notes |
|---|---|---|
| PostgreSQL | asyncpg | Full SQL, schema introspection |
| MySQL | aiomysql | Full SQL, schema introspection |
| SQLite | aiosqlite | File-based databases |
| CSV / Excel / JSON | Pandas + DuckDB | Upload files, query with SQL |
| Google Sheets | gspread | OAuth-based access |

## Project Structure

```
prompt-bi/
├── backend/                 # FastAPI application
│   ├── api/                 # Route handlers
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business logic
│   │   ├── prompt_engine/   # NL → SQL pipeline (Claude API)
│   │   └── connectors/      # Database & file connectors
│   └── migrations/          # Alembic migrations
├── frontend/                # React + TypeScript SPA
│   └── src/
│       ├── routes/          # Page components
│       ├── components/      # UI components (widgets, charts, canvas)
│       ├── stores/          # Zustand state management
│       └── lib/             # API client, utilities
├── docker-compose.yml       # Production stack
├── docker-compose.dev.yml   # Development stack (hot reload)
├── backend.Dockerfile       # Multi-stage Python build
├── frontend.Dockerfile      # Multi-stage Node + Nginx build
└── nginx.conf               # Reverse proxy config
```

## API Health Check

```
GET /api/health → { "status": "ok", "db": true, "redis": true }
```

## License

Private — all rights reserved.
