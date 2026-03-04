from contextlib import asynccontextmanager

import redis.asyncio as aioredis
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from loguru import logger

from backend.config import settings

# ── Socket.IO server ────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:5173", "http://localhost:3000"],
    namespaces=["/dashboard"],
)


@sio.event(namespace="/dashboard")
async def connect(sid, environ, auth=None):
    """Verify JWT on WebSocket connect, then join dashboard room."""
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        # Try from query string
        qs = environ.get("QUERY_STRING", "")
        for part in qs.split("&"):
            if part.startswith("token="):
                token = part.split("=", 1)[1]
    if not token:
        logger.warning(f"WS connect rejected (no token): {sid}")
        raise socketio.exceptions.ConnectionRefusedError("Authentication required")

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise socketio.exceptions.ConnectionRefusedError("Invalid token")
    except JWTError:
        raise socketio.exceptions.ConnectionRefusedError("Invalid token")

    await sio.save_session(sid, {"user_id": user_id}, namespace="/dashboard")
    logger.info(f"WS connected: {sid} (user {user_id})")


@sio.event(namespace="/dashboard")
async def join_dashboard(sid, data):
    """Client joins a dashboard room to receive real-time updates."""
    dashboard_id = data.get("dashboard_id") if isinstance(data, dict) else data
    if dashboard_id:
        sio.enter_room(sid, dashboard_id, namespace="/dashboard")
        logger.debug(f"WS {sid} joined room {dashboard_id}")


@sio.event(namespace="/dashboard")
async def leave_dashboard(sid, data):
    dashboard_id = data.get("dashboard_id") if isinstance(data, dict) else data
    if dashboard_id:
        sio.leave_room(sid, dashboard_id, namespace="/dashboard")


@sio.event(namespace="/dashboard")
async def disconnect(sid):
    logger.debug(f"WS disconnected: {sid}")


# ── FastAPI app ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Prompt BI backend...")

    # Store socketio reference for route handlers
    app.state.sio = sio

    # Connect to Redis
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await app.state.redis.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        app.state.redis = None

    yield

    # Shutdown
    if app.state.redis:
        await app.state.redis.close()
    logger.info("Prompt BI backend shut down")


app = FastAPI(
    title="Prompt BI",
    description="Natural-language Business Intelligence platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include API routers ─────────────────────────────────────
from backend.api.connections import router as connections_router
from backend.api.dashboards import router as dashboards_router
from backend.api.prompts import router as prompts_router
from backend.api.queries import router as queries_router
from backend.api.uploads import router as uploads_router
from backend.api.widgets import router as widgets_router

app.include_router(connections_router, prefix="/api")
app.include_router(uploads_router, prefix="/api")
app.include_router(prompts_router, prefix="/api")
app.include_router(dashboards_router, prefix="/api")
app.include_router(widgets_router, prefix="/api")
app.include_router(queries_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    redis_ok = False
    if hasattr(app.state, "redis") and app.state.redis:
        try:
            await app.state.redis.ping()
            redis_ok = True
        except Exception:
            pass

    return {"status": "ok", "redis": redis_ok}


# ── Combined ASGI app (FastAPI + Socket.IO) ──────────────────
asgi_app = socketio.ASGIApp(sio, other_app=app)
