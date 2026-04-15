# Prompt BI

A natural-language Business Intelligence platform. Type prompts like *"Show monthly revenue by region as a bar chart"* and get instant visualizations, tables, and KPI cards — then drag them onto a dashboard canvas.

## 🏗 Architecture Overview

The system is structured as a modern web application with a decoupled frontend and backend, powered by an AI-driven Prompt Engine.

```text
Frontend (React + TypeScript)          Backend (Python / FastAPI)
┌──────────────────────────┐           ┌──────────────────────────┐
│ Prompt Bar & UI          │  HTTP/WS  │ API & Auth               │
│ Dashboard Canvas (Grid)  │◄────────►│ Prompt Engine (Claude AI)│
│ Connections & Widgets    │           │ Query Engine & Services  │
└──────────────────────────┘           └──────────┬───────────────┘
                                                  │
                                       ┌──────────┴───────────────┐
                                       │ Data Connector Layer     │
                                       │ (SQL, DuckDB, GDrive)    │
                                       └──────────────────────────┘
```

### Core Modules

- **Frontend:** Built with React 18, TypeScript, and Vite. Uses Zustand for state management, Recharts for visualizations, and `react-grid-layout` for the drag-and-drop dashboard canvas.
- **Backend:** Asynchronous Python application powered by FastAPI and SQLAlchemy 2.0.
- **Prompt Engine:** The AI core that translates natural language into SQL and dashboard widgets using the Claude API. It handles intent classification, schema context building, query generation, and chart recommendation.
- **Data Connectors:** A unified interface to query multiple data sources:
  - Relational DBs: PostgreSQL, MySQL, SQLite.
  - File Uploads: CSV, Excel, and JSON (powered by Pandas and DuckDB for in-process SQL execution).
  - Cloud: Google Sheets via OAuth.

### Data Flow: From Prompt to Widget

1. **Intent Classification:** The user types a prompt. The system determines the intent (e.g., create a chart, show a table).
2. **Context Building:** The schema of the selected data source is formatted compactly.
3. **AI Generation:** Claude generates a safe SQL query and a recommended chart configuration based on the prompt and schema context.
4. **Execution:** The SQL query is validated and executed against the target data source via the Data Connector layer.
5. **Rendering:** The frontend receives the processed data and configuration, rendering the appropriate widget on the dashboard canvas.

## 📂 Project Structure

```text
prompt-bi/
├── backend/                 # FastAPI application
│   ├── api/                 # Route handlers (auth, dashboards, prompts, etc.)
│   ├── db/                  # Database engine and sessions
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Core business logic
│   │   ├── prompt_engine/   # AI pipeline (intent, generation, building)
│   │   └── connectors/      # Database & file adapters
│   └── utils/               # Helpers, SQL validation, encryption
├── frontend/                # React + TypeScript SPA
│   └── src/
│       ├── components/      # UI components (charts, canvas, widgets)
│       ├── hooks/           # Custom React hooks (data query, websockets)
│       ├── routes/          # Page views (dashboard, explore, connections)
│       └── stores/          # Zustand state management
├── docker-compose.yml       # Production stack orchestration
├── docker-compose.dev.yml   # Development stack overrides
├── backend.Dockerfile       # Backend container definition
└── frontend.Dockerfile      # Frontend container definition
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose (recommended for easiest setup)
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Environment Configuration

Copy the example configuration file and fill in your details:

```bash
cp .env.example .env
```

Key environment variables to configure in `.env`:
- `ANTHROPIC_API_KEY`: Your Claude API key (Required for the Prompt Engine).
- `JWT_SECRET`: A secure random string for JWT token generation.
- `DATABASE_URL`: Connection string for the application's PostgreSQL database.
- `REDIS_URL`: Connection string for the Redis cache.

*(Note: Do not commit your `.env` file or hardcode credentials in your source code.)*

### 🐳 Running via Docker (Recommended)

1. **Launch all services** (PostgreSQL, Redis, Backend, Frontend):
   ```bash
   docker compose up -d
   ```

2. **Apply Database Migrations**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

3. **Access the application**: Navigate to `http://localhost`.

### 💻 Local Development

For active development with hot-reloading:

1. **Start Infrastructure** (PostgreSQL and Redis):
   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres redis
   ```

2. **Backend Setup**:
   ```bash
   # Install dependencies (ensure you are in the project root)
   pip install -e ".[dev]"
   
   # Run migrations
   make migrate # Or: alembic upgrade head
   
   # Start the FastAPI dev server
   make dev     # Or: uvicorn backend.main:app --reload
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The backend API will be available at `http://localhost:8000` (Interactive Docs at `http://localhost:8000/docs`) and the frontend at `http://localhost:5173`.

## 📜 License

Private — all rights reserved.