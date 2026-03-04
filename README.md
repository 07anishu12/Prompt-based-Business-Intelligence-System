# Prompt-Based BI System — Python Architecture & Claude Code Prompts

---

## 1. System Vision

A **natural-language BI platform** (100% Python backend) where users type prompts like *"Show me monthly revenue by region as a bar chart"* and the system:

1. Connects to databases, Google Drive, and local files
2. Uses Claude API to convert the prompt into SQL/Pandas queries
3. Renders charts, tables, KPI cards, and text blocks
4. Lets users drag-and-drop widgets onto a freeform canvas dashboard
5. Saves, shares, and exports dashboards

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)                    │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Prompt Bar    │  │ Widget Gallery   │  │ Dashboard Canvas      │ │
│  │ (NL Input)    │  │ (Charts/Tables)  │  │ (Drag-Drop Grid)     │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬───────────┘ │
│         └────────────────────┼─────────────────────────┘             │
│                              │ HTTP + WebSocket                     │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                     BACKEND (Python / FastAPI)                       │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │
│  │ Prompt Engine   │  │ Query Engine   │  │ Dashboard Service      │ │
│  │ (Claude API)    │  │ (SQLAlchemy)   │  │ (CRUD + Layout)       │ │
│  └───────┬────────┘  └───────┬────────┘  └────────────────────────┘ │
│          │                   │                                       │
│  ┌───────┴───────────────────┴───────────────────────────────────┐  │
│  │                  Data Connector Layer (Python)                  │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐   │  │
│  │  │ Database  │  │ Google Drive │  │ Local Files            │   │  │
│  │  │(SQLAlchemy│  │ (gspread +   │  │ (Pandas: CSV/Excel/    │   │  │
│  │  │ + asyncpg)│  │  google-api) │  │  JSON/Parquet)         │   │  │
│  │  └──────────┘  └──────────────┘  └────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              App Database (PostgreSQL + SQLAlchemy)             │  │
│  │   users │ connections │ dashboards │ widgets │ query_logs      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Cache Layer (Redis via redis-py)                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Project Structure

```
prompt-bi/
├── pyproject.toml                  # Python project config (Poetry / uv)
├── docker-compose.yml              # Full stack orchestration
├── docker-compose.dev.yml          # Dev overrides
├── .env.example                    # All env vars documented
├── Makefile                        # dev, migrate, seed, test, docker-up
├── alembic.ini                     # Alembic config
│
├── backend/                        # Python backend (FastAPI)
│   ├── __init__.py
│   ├── main.py                     # FastAPI app entry, lifespan, CORS
│   ├── config.py                   # Pydantic Settings (env vars)
│   ├── dependencies.py             # Dependency injection (db session, current_user)
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── engine.py               # async SQLAlchemy engine + sessionmaker
│   │   ├── base.py                 # DeclarativeBase
│   │   └── session.py              # get_async_session dependency
│   │
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py                 # User model
│   │   ├── connection.py           # DataConnection model
│   │   ├── dashboard.py            # Dashboard model
│   │   ├── widget.py               # Widget model
│   │   └── query_log.py            # QueryLog model
│   │
│   ├── schemas/                    # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── user.py                 # UserCreate, UserRead, UserLogin
│   │   ├── connection.py           # ConnectionCreate, ConnectionRead, SchemaMetadata
│   │   ├── dashboard.py            # DashboardCreate, DashboardRead, LayoutUpdate
│   │   ├── widget.py               # WidgetCreate, WidgetRead, WidgetConfig
│   │   ├── prompt.py               # PromptRequest, PromptResponse, WidgetResult
│   │   └── query.py                # QueryRequest, QueryResult
│   │
│   ├── api/                        # API route handlers
│   │   ├── __init__.py
│   │   ├── router.py               # Main APIRouter combining all sub-routers
│   │   ├── auth.py                 # POST /register, /login, /refresh, GET /me
│   │   ├── connections.py          # CRUD connections + test + sync + upload
│   │   ├── dashboards.py           # CRUD dashboards + layout + export + share
│   │   ├── widgets.py              # CRUD widgets + refresh + modify
│   │   ├── prompts.py              # POST /prompt, /prompt/explain, /prompt/suggest
│   │   ├── queries.py              # POST /query/execute, GET /query/history
│   │   └── uploads.py              # POST /upload (CSV, Excel, JSON)
│   │
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── prompt_engine/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py           # Main orchestrator: prompt → widget
│   │   │   ├── intent_classifier.py    # Classify prompt intent
│   │   │   ├── schema_context.py       # Build schema context for LLM
│   │   │   ├── query_generator.py      # Claude API → SQL generation
│   │   │   ├── chart_recommender.py    # Pick best chart type from data
│   │   │   └── widget_builder.py       # Assemble final widget config
│   │   │
│   │   ├── connectors/
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # Abstract DataConnector protocol
│   │   │   ├── factory.py          # ConnectorFactory
│   │   │   ├── postgres.py         # PostgresConnector (asyncpg)
│   │   │   ├── mysql.py            # MySQLConnector (aiomysql)
│   │   │   ├── sqlite.py           # SQLiteConnector (aiosqlite)
│   │   │   ├── csv_connector.py    # CSVConnector (pandas + DuckDB)
│   │   │   ├── excel_connector.py  # ExcelConnector (openpyxl + DuckDB)
│   │   │   ├── json_connector.py   # JSONConnector (pandas + DuckDB)
│   │   │   └── gdrive.py           # GoogleDriveConnector (gspread)
│   │   │
│   │   ├── dashboard_service.py    # Dashboard CRUD + layout logic
│   │   ├── widget_service.py       # Widget CRUD + data refresh
│   │   ├── export_service.py       # PDF/PNG export (Playwright)
│   │   ├── auth_service.py         # JWT + password hashing
│   │   └── cache_service.py        # Redis caching layer
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py                 # JWT verification middleware
│   │   ├── rate_limiter.py         # Rate limiting (slowapi)
│   │   └── error_handler.py        # Global exception handlers
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── encryption.py           # AES-256 encrypt/decrypt for connection configs
│   │   ├── sql_validator.py        # Validate generated SQL is safe (SELECT only)
│   │   └── helpers.py              # Misc utilities
│   │
│   └── migrations/                 # Alembic migrations
│       ├── env.py
│       └── versions/
│           ├── 001_create_users.py
│           ├── 002_create_connections.py
│           ├── 003_create_dashboards.py
│           ├── 004_create_widgets.py
│           └── 005_create_query_logs.py
│
├── frontend/                       # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/
│       │   ├── index.tsx               # Dashboard list (home)
│       │   ├── dashboard/[id].tsx      # Canvas view
│       │   ├── connections.tsx          # Manage data sources
│       │   ├── explore.tsx             # Prompt-first exploration
│       │   └── auth.tsx                # Login / Register
│       ├── components/
│       │   ├── prompt/
│       │   │   ├── PromptBar.tsx
│       │   │   ├── PromptSuggestions.tsx
│       │   │   └── PromptHistory.tsx
│       │   ├── canvas/
│       │   │   ├── DashboardCanvas.tsx     # react-grid-layout wrapper
│       │   │   ├── WidgetWrapper.tsx        # Drag/resize container
│       │   │   └── CanvasToolbar.tsx        # Dashboard controls
│       │   ├── widgets/
│       │   │   ├── WidgetRenderer.tsx       # Route to correct widget
│       │   │   ├── ChartWidget.tsx          # Chart container
│       │   │   ├── TableWidget.tsx          # Data table
│       │   │   ├── KPIWidget.tsx            # Single metric card
│       │   │   ├── TextWidget.tsx           # Rich text block
│       │   │   └── FilterWidget.tsx         # Global filter control
│       │   ├── charts/
│       │   │   ├── BarChart.tsx
│       │   │   ├── LineChart.tsx
│       │   │   ├── PieChart.tsx
│       │   │   ├── AreaChart.tsx
│       │   │   ├── ScatterPlot.tsx
│       │   │   └── Heatmap.tsx
│       │   ├── connections/
│       │   │   ├── ConnectionForm.tsx
│       │   │   ├── DatabaseConnector.tsx
│       │   │   ├── GoogleDriveConnector.tsx
│       │   │   ├── FileUploader.tsx
│       │   │   └── SchemaExplorer.tsx
│       │   └── shared/
│       │       ├── Sidebar.tsx
│       │       ├── Header.tsx
│       │       ├── Modal.tsx
│       │       └── Toast.tsx
│       ├── stores/
│       │   ├── dashboardStore.ts
│       │   ├── connectionStore.ts
│       │   ├── promptStore.ts
│       │   └── authStore.ts
│       ├── hooks/
│       │   ├── usePromptEngine.ts
│       │   ├── useDragDrop.ts
│       │   ├── useDataQuery.ts
│       │   └── useWebSocket.ts
│       ├── lib/
│       │   ├── api.ts                  # Axios client
│       │   ├── chartConfig.ts
│       │   └── canvasLayout.ts
│       └── types/
│           ├── widget.ts
│           ├── connection.ts
│           ├── dashboard.ts
│           └── query.ts
│
├── scripts/
│   ├── seed_demo.py                # Load demo data
│   └── generate_schema.py          # Auto-generate Pydantic from DB
│
├── tests/
│   ├── conftest.py                 # Fixtures (async client, test DB)
│   ├── test_prompt_engine.py
│   ├── test_connectors.py
│   ├── test_api_auth.py
│   ├── test_api_dashboards.py
│   └── test_api_prompts.py
│
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    └── PROMPTING-GUIDE.md
```

---

## 4. Python Dependencies

```toml
# pyproject.toml
[project]
name = "prompt-bi"
version = "1.0.0"
requires-python = ">=3.11"

dependencies = [
    # Web framework
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.27.0",
    "python-multipart>=0.0.9",

    # Database
    "sqlalchemy[asyncio]>=2.0.25",
    "asyncpg>=0.29.0",           # PostgreSQL async driver
    "alembic>=1.13.0",           # Migrations
    "aiosqlite>=0.19.0",         # SQLite async (for file connectors)
    "aiomysql>=0.2.0",           # MySQL async

    # Data processing
    "pandas>=2.2.0",
    "duckdb>=0.10.0",            # In-process SQL on CSV/Excel/JSON
    "openpyxl>=3.1.0",           # Excel reading
    "pyarrow>=15.0.0",           # Parquet support

    # AI / LLM
    "anthropic>=0.18.0",         # Claude API

    # Google Drive
    "google-api-python-client>=2.116.0",
    "google-auth-oauthlib>=1.2.0",
    "gspread>=6.0.0",

    # Auth & Security
    "python-jose[cryptography]>=3.3.0",  # JWT
    "passlib[bcrypt]>=1.7.4",            # Password hashing
    "cryptography>=42.0.0",              # AES encryption

    # Caching & Realtime
    "redis[hiredis]>=5.0.0",
    "python-socketio>=5.11.0",

    # Export
    "playwright>=1.41.0",        # PDF/PNG export

    # Utilities
    "pydantic>=2.6.0",
    "pydantic-settings>=2.1.0",
    "slowapi>=0.1.9",            # Rate limiting
    "loguru>=0.7.0",             # Logging
    "sqlparse>=0.4.4",           # SQL parsing/validation
    "httpx>=0.27.0",             # Async HTTP client
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",             # TestClient
    "ruff>=0.2.0",               # Linting
    "mypy>=1.8.0",
]
```

---

## 5. Database Schema (SQLAlchemy Models)

```python
# backend/models/user.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    connections = relationship("DataConnection", back_populates="user", cascade="all, delete")
    dashboards = relationship("Dashboard", back_populates="user", cascade="all, delete")


# backend/models/connection.py
class DataConnection(Base):
    __tablename__ = "connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))  # postgres, mysql, sqlite, gdrive, csv, excel, json
    config: Mapped[dict] = mapped_column(JSONB)     # encrypted connection params
    schema_cache: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    last_synced: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="connections")
    widgets = relationship("Widget", back_populates="connection")


# backend/models/dashboard.py
class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    layout: Mapped[dict] = mapped_column(JSONB, default=dict)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_public: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="dashboards")
    widgets = relationship("Widget", back_populates="dashboard", cascade="all, delete")


# backend/models/widget.py
class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("dashboards.id", ondelete="CASCADE"))
    connection_id: Mapped[uuid.UUID | None] = mapped_column(UUID, ForeignKey("connections.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(50))  # bar, line, pie, table, kpi, text, filter
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    prompt_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    query_config: Mapped[dict] = mapped_column(JSONB)
    chart_config: Mapped[dict] = mapped_column(JSONB)
    layout_position: Mapped[dict] = mapped_column(JSONB)  # {x, y, w, h}
    cached_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    refresh_interval: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    dashboard = relationship("Dashboard", back_populates="widgets")
    connection = relationship("DataConnection", back_populates="widgets")


# backend/models/query_log.py
class QueryLog(Base):
    __tablename__ = "query_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("users.id"))
    connection_id: Mapped[uuid.UUID | None] = mapped_column(UUID, ForeignKey("connections.id"), nullable=True)
    prompt: Mapped[str] = mapped_column(Text)
    generated_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    intent: Mapped[str | None] = mapped_column(String(50), nullable=True)
    execution_ms: Mapped[int | None] = mapped_column(nullable=True)
    row_count: Mapped[int | None] = mapped_column(nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
```

---

## 6. The Prompt Engine Pipeline

```
User types: "Top 10 products by revenue as a bar chart"
  │
  ▼
┌─────────────────────────┐
│ 1. intent_classifier.py │ → "create_chart"
│    (keyword + Claude)   │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 2. schema_context.py    │ → Builds compact schema string for Claude
│    (SQLAlchemy inspect)  │    "products(id, name, price), orders(id,
│                          │     product_id FK→products.id, quantity, date)"
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 3. query_generator.py   │ → Calls Claude API with schema + prompt
│    (anthropic SDK)       │    Returns: {sql, chart_type, chart_config, title}
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 4. sql_validator.py     │ → Validates: SELECT only, no dangerous funcs,
│    (sqlparse)            │    parameterized, timeout limit
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 5. Execute Query         │ → Run via SQLAlchemy/DuckDB against data source
│    (connector.execute)   │    Returns: rows + column metadata
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 6. chart_recommender.py │ → If chart type ambiguous, analyze data shape:
│                          │    1 row → KPI, time series → line, etc.
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 7. widget_builder.py    │ → Assemble complete Widget:
│                          │    {type, title, data, chartConfig, layout}
└──────────┬──────────────┘
           ▼
  Return widget to frontend → User drags onto canvas
```

---

## 7. Key Pydantic Schemas

```python
# backend/schemas/prompt.py
from pydantic import BaseModel
from typing import Optional, Any

class PromptRequest(BaseModel):
    prompt: str
    connection_id: Optional[str] = None
    dashboard_id: Optional[str] = None

class ChartConfig(BaseModel):
    x_field: str
    y_fields: list[str]
    group_field: Optional[str] = None
    aggregation: str = "sum"
    colors: list[str] = []
    stacked: bool = False
    show_values: bool = True
    orientation: str = "vertical"  # vertical | horizontal

class QueryInfo(BaseModel):
    sql: str
    params: list[Any] = []
    execution_ms: int
    row_count: int

class LayoutPosition(BaseModel):
    x: int
    y: int
    w: int
    h: int
    min_w: int = 2
    min_h: int = 2

class WidgetResult(BaseModel):
    id: Optional[str] = None
    type: str          # bar, line, pie, area, scatter, table, kpi, text, filter
    title: str
    prompt_used: str
    query_config: dict
    chart_config: ChartConfig
    layout_position: LayoutPosition
    data: list[dict[str, Any]]
    explanation: str

class PromptResponse(BaseModel):
    widget: WidgetResult
    query_info: QueryInfo
    explanation: str


# backend/schemas/connection.py
class ColumnMetadata(BaseModel):
    name: str
    type: str             # string, number, date, boolean
    is_primary_key: bool = False
    is_foreign_key: bool = False
    sample_values: list[str] = []

class TableMetadata(BaseModel):
    name: str
    columns: list[ColumnMetadata]
    row_count: int
    relationships: list[dict] = []

class SchemaMetadata(BaseModel):
    tables: list[TableMetadata]

class ConnectionCreate(BaseModel):
    name: str
    type: str  # postgres, mysql, sqlite, gdrive, csv, excel, json
    config: dict

class ConnectionRead(BaseModel):
    id: str
    name: str
    type: str
    status: str
    schema_cache: Optional[SchemaMetadata] = None
    last_synced: Optional[str] = None
```

---

## 8. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| **Backend Framework** | FastAPI (async) | Fastest Python web framework, auto-docs, Pydantic native |
| **ORM** | SQLAlchemy 2.0 (async) | Industry standard, async support, migration-ready |
| **Migrations** | Alembic | SQLAlchemy's official migration tool |
| **App Database** | PostgreSQL 15 | JSONB for widget configs, robust, production-grade |
| **Cache** | Redis 7 | Schema cache, rate limits, session data |
| **AI Engine** | Claude API (anthropic SDK) | NL → SQL, intent classification, suggestions |
| **Data Processing** | Pandas + DuckDB | Pandas for ETL, DuckDB for SQL on files |
| **File Connectors** | openpyxl, csv, json | Native Python libraries for all file types |
| **Google Integration** | gspread + google-api | Google Sheets/Drive access |
| **Auth** | python-jose + passlib | JWT tokens + bcrypt password hashing |
| **Encryption** | cryptography (Fernet) | AES-256 for connection secrets |
| **Realtime** | python-socketio | WebSocket for live dashboard updates |
| **Export** | Playwright | Headless browser for PDF/PNG screenshots |
| **Rate Limiting** | slowapi | Per-endpoint rate limits |
| **Logging** | loguru | Better Python logging |
| **SQL Safety** | sqlparse | Parse and validate generated SQL |
| **Frontend** | React 18 + TypeScript | Component-based UI |
| **Styling** | Tailwind CSS 3 | Utility-first, dark mode built-in |
| **Charts** | Recharts | React-native charting library |
| **Grid Layout** | react-grid-layout | Drag-drop dashboard canvas |
| **State** | Zustand | Lightweight, no boilerplate |
| **Data Fetching** | TanStack React Query | Caching, background refresh |
| **Container** | Docker + Docker Compose | One-command deployment |

---

## 10. Data Flow: Prompt to Dashboard Widget

```
User types: "Show top 10 customers by revenue as a bar chart"
  │
  ├─ POST /api/prompt { prompt, connection_id, dashboard_id }
  │
  ├─ IntentClassifier: "chart/bar" keywords → "create_chart"
  │
  ├─ SchemaContext builds:
  │   "Table: customers(id INT PK, name VARCHAR, email VARCHAR)
  │    Table: orders(id INT PK, customer_id INT FK→customers.id,
  │           amount DECIMAL [99.99, 250.00], status VARCHAR
  │           [completed, pending], order_date DATE)"
  │
  ├─ QueryGenerator → Claude API returns:
  │   {
  │     "sql": "SELECT c.name AS customer, SUM(o.amount) AS revenue
  │             FROM customers c JOIN orders o ON o.customer_id = c.id
  │             WHERE o.status = 'completed'
  │             GROUP BY c.name ORDER BY revenue DESC LIMIT 10",
  │     "chart_type": "bar",
  │     "chart_config": {"x_field":"customer", "y_fields":["revenue"]},
  │     "title": "Top 10 Customers by Revenue"
  │   }
  │
  ├─ sql_validator: ✓ SELECT only, no dangerous functions
  │
  ├─ Execute via PostgresConnector: 10 rows, 45ms
  │
  ├─ ChartRecommender: confirms "bar" (categorical + numeric)
  │
  ├─ WidgetBuilder: creates Widget with data + config + layout {x:0,y:0,w:6,h:4}
  │
  ├─ Save to DB (widgets table), emit WebSocket "widget:created"
  │
  └─ Frontend receives widget → renders BarChart on canvas
```

