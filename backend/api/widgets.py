"""Widget CRUD API — create, read, update, position, delete, refresh."""

from __future__ import annotations

import copy
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.session import get_db_session
from backend.dependencies import get_current_user
from backend.models.dashboard import Dashboard
from backend.models.user import User
from backend.models.widget import Widget
from backend.schemas.widget import WidgetCreate, WidgetUpdate
from backend.services.connectors.factory import ConnectorFactory
from backend.utils.encryption import decrypt_config

router = APIRouter(prefix="/widgets", tags=["widgets"])


async def _get_widget_or_404(widget_id: str, user: User, db: AsyncSession) -> Widget:
    try:
        uid = uuid.UUID(widget_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid widget ID")

    result = await db.execute(select(Widget).where(Widget.id == uid))
    widget = result.scalar_one_or_none()
    if widget is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Widget not found")

    # Verify user owns the parent dashboard
    dash_result = await db.execute(
        select(Dashboard).where(
            Dashboard.id == widget.dashboard_id, Dashboard.user_id == user.id
        )
    )
    if dash_result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    return widget


async def _next_widget_position(dashboard_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(Widget.layout_position).where(Widget.dashboard_id == dashboard_id)
    )
    positions = result.scalars().all()
    if not positions:
        return 0

    return max(
        int((layout or {}).get("position", index))
        for index, layout in enumerate(positions)
    ) + 1


def _merge_layout_position(
    current: dict | None,
    updates: dict | None,
    *,
    default_position: int | None = None,
) -> dict:
    layout = {**(current or {})}
    layout.update(updates or {})

    if layout.get("position") is None and default_position is not None:
        layout["position"] = default_position

    return layout


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_widget(
    body: WidgetCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Manual widget creation (not from prompt)."""
    # Verify dashboard ownership
    try:
        dash_uuid = uuid.UUID(body.dashboard_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid dashboard_id")

    dash_result = await db.execute(
        select(Dashboard).where(Dashboard.id == dash_uuid, Dashboard.user_id == user.id)
    )
    if dash_result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dashboard not found")

    layout_position = _merge_layout_position(
        None,
        body.layout_position,
        default_position=await _next_widget_position(dash_uuid, db),
    )

    widget = Widget(
        dashboard_id=dash_uuid,
        connection_id=uuid.UUID(body.connection_id) if body.connection_id else None,
        type=body.type,
        title=body.title,
        query_config=body.query_config,
        chart_config=body.chart_config,
        layout_position=layout_position,
    )
    db.add(widget)
    await db.flush()
    await db.refresh(widget)
    return _widget_response(widget)


@router.get("/{widget_id}")
async def get_widget(
    widget_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    widget = await _get_widget_or_404(widget_id, user, db)
    return _widget_response(widget)


@router.put("/{widget_id}")
async def update_widget(
    widget_id: str,
    body: WidgetUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    widget = await _get_widget_or_404(widget_id, user, db)
    if body.title is not None:
        widget.title = body.title
    if body.type is not None:
        widget.type = body.type
    if body.chart_config is not None:
        widget.chart_config = body.chart_config
    if body.layout_position is not None:
        widget.layout_position = _merge_layout_position(
            widget.layout_position,
            body.layout_position,
        )
    await db.flush()
    await db.refresh(widget)
    payload = _widget_response(widget)

    sio = getattr(request.app.state, "sio", None)
    if sio:
        await sio.emit(
            "widget:updated",
            payload,
            room=str(widget.dashboard_id),
            namespace="/dashboard",
        )

    return payload


@router.post("/{widget_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_widget(
    widget_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    widget = await _get_widget_or_404(widget_id, user, db)

    siblings_result = await db.execute(
        select(Widget).where(Widget.dashboard_id == widget.dashboard_id)
    )
    siblings = siblings_result.scalars().all()

    max_y = max(
        (
            int((s.layout_position or {}).get("y", 0))
            + int((s.layout_position or {}).get("h", 0))
        )
        for s in siblings
    ) if siblings else 0
    max_position = max(
        int((s.layout_position or {}).get("position", index))
        for index, s in enumerate(siblings)
    ) if siblings else -1

    new_layout = copy.deepcopy(widget.layout_position) if widget.layout_position else {}
    new_layout.update(
        {
            "x": 0,
            "y": max_y,
            "w": int(new_layout.get("w", 6)),
            "h": int(new_layout.get("h", 4)),
            "position": max_position + 1,
        }
    )

    new_widget = Widget(
        dashboard_id=widget.dashboard_id,
        connection_id=widget.connection_id,
        type=widget.type,
        title=f"{widget.title or 'Untitled'} Copy",
        prompt_used=widget.prompt_used,
        query_config=copy.deepcopy(widget.query_config) if widget.query_config else {},
        chart_config=copy.deepcopy(widget.chart_config) if widget.chart_config else {},
        layout_position=new_layout,
        cached_data=copy.deepcopy(widget.cached_data) if widget.cached_data else None,
        refresh_interval=widget.refresh_interval,
    )
    db.add(new_widget)
    await db.flush()
    await db.refresh(new_widget)
    return _widget_response(new_widget)


@router.put("/{widget_id}/position")
async def update_position(
    widget_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    widget = await _get_widget_or_404(widget_id, user, db)
    widget.layout_position = _merge_layout_position(
        widget.layout_position,
        {
            "x": body.get("x", 0),
            "y": body.get("y", 0),
            "w": body.get("w", 6),
            "h": body.get("h", 4),
            "position": body.get(
                "position",
                (widget.layout_position or {}).get("position"),
            ),
        },
    )
    await db.flush()
    await db.refresh(widget)

    # Emit WebSocket event
    sio = getattr(request.app.state, "sio", None)
    if sio:
        await sio.emit(
            "widget:moved",
            {
                "id": widget_id,
                "widget_id": widget_id,
                "layout_position": widget.layout_position,
                "position": widget.layout_position,
            },
            room=str(widget.dashboard_id),
            namespace="/dashboard",
        )

    return _widget_response(widget)


@router.delete("/{widget_id}")
async def delete_widget(
    widget_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    widget = await _get_widget_or_404(widget_id, user, db)
    dashboard_id = str(widget.dashboard_id)
    await db.delete(widget)

    # Emit WebSocket event
    sio = getattr(request.app.state, "sio", None)
    if sio:
        await sio.emit(
            "widget:deleted",
            {"id": widget_id, "widget_id": widget_id},
            room=dashboard_id,
            namespace="/dashboard",
        )

    return {"deleted": True}


@router.post("/{widget_id}/refresh")
async def refresh_widget(
    widget_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Re-execute the widget's stored query against its connection."""
    widget = await _get_widget_or_404(widget_id, user, db)

    sql = (widget.query_config or {}).get("sql")
    if not sql:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Widget has no stored query")

    if not widget.connection_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Widget has no connection")

    # Get connection config
    from backend.models.connection import DataConnection

    result = await db.execute(
        select(DataConnection).where(DataConnection.id == widget.connection_id)
    )
    db_conn = result.scalar_one_or_none()
    if db_conn is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection not found")

    config = decrypt_config(db_conn.config, settings.JWT_SECRET)
    connector = ConnectorFactory.create(db_conn.type, config)
    try:
        params = (widget.query_config or {}).get("params")
        qr = await connector.execute_query(sql, params or None)
        widget.cached_data = {"rows": qr.rows}
        await db.flush()
        await db.refresh(widget)
        return _widget_response(widget)
    except Exception as e:
        logger.error(f"Widget refresh failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Refresh failed: {e}")
    finally:
        await connector.disconnect()


# Use shared widget serializer
from backend.api._helpers import widget_to_dict as _widget_response
