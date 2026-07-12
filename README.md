# Prompt BI

> A natural-language business-intelligence platform that turns a question into a validated query, an appropriate visualization, and an interactive dashboard widget.

Prompt BI is an end-to-end application for exploring structured data without writing SQL manually. A user can ask for a question such as _“Show monthly revenue by region as a bar chart”_; the platform builds schema-aware context, generates a query and chart recommendation, validates the query, executes it through a connector, and renders the resulting widget in a dashboard.

## Why it exists

Business teams want self-service answers, while data teams need control over schema access, query safety, and auditability. Prompt BI is designed around that boundary: natural language improves access to data, but the generated query must still pass through explicit validation and a data-connector layer.

## Core capabilities

- Natural-language intent classification and prompt optimization.
- Schema-aware query generation and chart recommendations.
- SQL validation before execution.
- Connectors for PostgreSQL, MySQL, SQLite, CSV, Excel, JSON, DuckDB, and Google Drive/Sheets workflows.
- Dashboard and widget management with a React grid-based canvas.
- Authentication, database migrations, caching, rate limiting, export, and query logging foundations.

## Architecture

```text
React + TypeScript dashboard
          │ HTTP / WebSocket
          ▼
FastAPI application ── auth, dashboards, widgets, queries
          │
          ├── Prompt engine: intent → schema context → SQL/chart suggestion
          ├── SQL validation and audit logging
          └── Connector layer: databases, files, and cloud sources
```

## Repository layout

```text
backend/
  api/                 # HTTP routes
  services/
    prompt_engine/     # intent, query, chart, widget pipeline
    connectors/        # database and file-source adapters
  models/ schemas/     # SQLAlchemy models and Pydantic contracts
  migrations/          # Alembic migrations
frontend/
  src/components/      # charts, widgets, dashboard canvas
  src/routes/          # application views
  src/stores/          # client state
tests/                 # backend and integration tests
docker-compose.yml     # local multi-service environment
```

## Technology

- **Frontend:** React, TypeScript, Vite, Zustand, Recharts, react-grid-layout
- **Backend:** Python, FastAPI, SQLAlchemy 2, Alembic
- **Data:** PostgreSQL, MySQL, SQLite, DuckDB, CSV, Excel, JSON, Google Sheets
- **Operations:** Docker Compose, Redis, environment-based configuration
- **AI:** a model-backed prompt engine with explicit schema context and query validation

## Run locally

### Prerequisites

- Docker and Docker Compose (recommended)
- Node.js 20+
- Python 3.11+

Create a local environment file:

```bash
cp .env.example .env
```

Configure the database, Redis, application secrets, and the model-provider key required by the prompt engine. Do not commit `.env` files or real credentials.

Start the full stack:

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
```

For active development, start PostgreSQL and Redis with `docker-compose.dev.yml`, run the FastAPI backend with `make dev`, and run the frontend with `npm run dev` from `frontend/`.

## Quality and safety direction

This project intentionally treats text-to-SQL as a systems problem rather than a prompt-only problem. The next milestones are a public redacted demo, adversarial SQL-safety tests, a compact prompt-evaluation suite, connector contract tests, and a documented model/latency/cost evaluation.

## Status

Active portfolio project. Contributions and feedback are welcome through issues after the public contribution guide is added.
