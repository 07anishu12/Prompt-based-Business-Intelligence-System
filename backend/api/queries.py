"""Direct SQL query execution and query history API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.session import get_db_session
from backend.dependencies import get_current_user
from backend.models.connection import DataConnection
from backend.models.query_log import QueryLog
from backend.models.user import User
from backend.schemas.query import QueryRequest, QueryResult
from backend.services.connectors.factory import ConnectorFactory
from backend.utils.encryption import decrypt_config
from backend.utils.sql_validator import UnsafeQueryError, validate_sql

router = APIRouter(prefix="/query", tags=["query"])

MAX_ROWS = 10_000


@router.post("/execute", response_model=QueryResult)
async def execute_query(
    body: QueryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Execute a raw SQL query (SELECT only) against a connection."""
    # Validate SQL safety
    try:
        validate_sql(body.sql)
    except UnsafeQueryError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    # Get connection
    try:
        conn_uuid = uuid.UUID(body.connection_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid connection_id")

    result = await db.execute(
        select(DataConnection).where(
            DataConnection.id == conn_uuid, DataConnection.user_id == user.id
        )
    )
    db_conn = result.scalar_one_or_none()
    if db_conn is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection not found")

    config = decrypt_config(
        db_conn.config if isinstance(db_conn.config, str) else db_conn.config,
        settings.JWT_SECRET,
    )
    connector = ConnectorFactory.create(db_conn.type, config)

    try:
        qr = await connector.execute_query(body.sql, body.params or None)
    except Exception as e:
        # Log failure
        log = QueryLog(
            user_id=user.id,
            connection_id=conn_uuid,
            prompt=body.sql,
            generated_query=body.sql,
            error=str(e),
        )
        db.add(log)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Query failed: {e}")
    finally:
        await connector.disconnect()

    # Enforce max rows
    rows = qr.rows[:MAX_ROWS]

    # Log success
    log = QueryLog(
        user_id=user.id,
        connection_id=conn_uuid,
        prompt=body.sql,
        generated_query=body.sql,
        execution_ms=qr.execution_ms,
        row_count=len(rows),
    )
    db.add(log)

    return QueryResult(
        columns=qr.columns,
        rows=rows,
        row_count=len(rows),
        execution_ms=qr.execution_ms,
    )


@router.get("/history")
async def query_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Return the user's last 50 queries."""
    result = await db.execute(
        select(QueryLog)
        .where(QueryLog.user_id == user.id)
        .order_by(QueryLog.created_at.desc())
        .limit(50)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "prompt": log.prompt,
            "generated_query": log.generated_query,
            "intent": log.intent,
            "execution_ms": log.execution_ms,
            "row_count": log.row_count,
            "error": log.error,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
