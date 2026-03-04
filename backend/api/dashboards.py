"""Dashboard CRUD API — create, read, update, delete, duplicate, export, share."""

from __future__ import annotations

import copy
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.db.session import get_db_session
from backend.dependencies import get_current_user
from backend.models.dashboard import Dashboard
from backend.models.user import User
from backend.models.widget import Widget
from backend.schemas.dashboard import (
    DashboardCreate,
    DashboardDetail,
    DashboardRead,
    LayoutUpdate,
)

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


# ── helpers ──────────────────────────────────────────────────

async def _get_dashboard_or_404(
    dashboard_id: str, user: User | None, db: AsyncSession, *, public_ok: bool = False
) -> Dashboard:
    try:
        uid = uuid.UUID(dashboard_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid dashboard ID")

    result = await db.execute(
        select(Dashboard).options(selectinload(Dashboard.widgets)).where(Dashboard.id == uid)
    )
    dashboard = result.scalar_one_or_none()
    if dashboard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dashboard not found")

    if public_ok and dashboard.is_public:
        return dashboard
    if user and dashboard.user_id == user.id:
        return dashboard

    raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")


def _dashboard_to_read(d: Dashboard) -> dict:
    return {
        "id": str(d.id),
        "title": d.title,
        "description": d.description,
        "layout": d.layout or {},
        "settings": d.settings or {},
        "is_public": d.is_public,
        "widget_count": len(d.widgets) if d.widgets else 0,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


def _widget_to_dict(w: Widget) -> dict:
    return {
        "id": str(w.id),
        "dashboard_id": str(w.dashboard_id),
        "type": w.type,
        "title": w.title,
        "prompt_used": w.prompt_used,
        "chart_config": w.chart_config or {},
        "layout_position": w.layout_position or {},
        "data": (w.cached_data or {}).get("rows", []),
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


# ── routes ───────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    body: DashboardCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    dashboard = Dashboard(
        user_id=user.id,
        title=body.title,
        description=body.description,
        layout={},
        settings={},
    )
    db.add(dashboard)
    await db.flush()
    await db.refresh(dashboard)
    return _dashboard_to_read(dashboard)


@router.get("")
async def list_dashboards(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.widgets))
        .where(Dashboard.user_id == user.id)
        .order_by(Dashboard.updated_at.desc())
    )
    dashboards = result.scalars().all()
    return [_dashboard_to_read(d) for d in dashboards]


@router.get("/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    d = await _get_dashboard_or_404(dashboard_id, user, db)
    data = _dashboard_to_read(d)
    data["widgets"] = [_widget_to_dict(w) for w in d.widgets]
    return data


@router.put("/{dashboard_id}")
async def update_dashboard(
    dashboard_id: str,
    body: DashboardCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    d = await _get_dashboard_or_404(dashboard_id, user, db)
    d.title = body.title
    if body.description is not None:
        d.description = body.description
    await db.flush()
    await db.refresh(d)
    return _dashboard_to_read(d)


@router.put("/{dashboard_id}/layout")
async def update_layout(
    dashboard_id: str,
    body: LayoutUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Batch update widget positions in a single transaction."""
    d = await _get_dashboard_or_404(dashboard_id, user, db)

    for item in body.widgets:
        try:
            w_uuid = uuid.UUID(item.id)
        except ValueError:
            continue
        result = await db.execute(select(Widget).where(Widget.id == w_uuid))
        widget = result.scalar_one_or_none()
        if widget and widget.dashboard_id == d.id:
            widget.layout_position = {"x": item.x, "y": item.y, "w": item.w, "h": item.h}

    await db.flush()

    # Emit WebSocket event
    sio = getattr(request.app.state, "sio", None)
    if sio:
        await sio.emit(
            "dashboard:layout_changed",
            {"dashboard_id": dashboard_id},
            room=dashboard_id,
            namespace="/dashboard",
        )

    return {"updated": True}


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    d = await _get_dashboard_or_404(dashboard_id, user, db)
    await db.delete(d)
    return {"deleted": True}


@router.post("/{dashboard_id}/duplicate")
async def duplicate_dashboard(
    dashboard_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Deep clone: new dashboard + copies of all widgets."""
    original = await _get_dashboard_or_404(dashboard_id, user, db)

    new_dashboard = Dashboard(
        user_id=user.id,
        title=f"{original.title} (Copy)",
        description=original.description,
        layout=copy.deepcopy(original.layout) if original.layout else {},
        settings=copy.deepcopy(original.settings) if original.settings else {},
    )
    db.add(new_dashboard)
    await db.flush()

    for w in original.widgets:
        new_widget = Widget(
            dashboard_id=new_dashboard.id,
            connection_id=w.connection_id,
            type=w.type,
            title=w.title,
            prompt_used=w.prompt_used,
            query_config=copy.deepcopy(w.query_config) if w.query_config else {},
            chart_config=copy.deepcopy(w.chart_config) if w.chart_config else {},
            layout_position=copy.deepcopy(w.layout_position) if w.layout_position else {},
            cached_data=copy.deepcopy(w.cached_data) if w.cached_data else None,
            refresh_interval=w.refresh_interval,
        )
        db.add(new_widget)

    await db.flush()
    await db.refresh(new_dashboard)
    return _dashboard_to_read(new_dashboard)


@router.post("/{dashboard_id}/export")
async def export_dashboard(
    dashboard_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Export dashboard as PDF or PNG using Playwright."""
    d = await _get_dashboard_or_404(dashboard_id, user, db)
    fmt = body.get("format", "pdf")
    if fmt not in ("pdf", "png"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Format must be 'pdf' or 'png'")

    from backend.services.export_service import export_dashboard as do_export

    try:
        file_bytes, content_type = await do_export(str(d.id), fmt)
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Export failed: {e}")

    filename = f"{d.title.replace(' ', '_')}.{fmt}"
    return StreamingResponse(
        iter([file_bytes]),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/{dashboard_id}/share")
async def toggle_share(
    dashboard_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    d = await _get_dashboard_or_404(dashboard_id, user, db)
    d.is_public = not d.is_public
    await db.flush()
    share_url = f"/public/dashboard/{d.id}" if d.is_public else None
    return {"is_public": d.is_public, "share_url": share_url}


@router.get("/public/{dashboard_id}")
async def get_public_dashboard(
    dashboard_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """No auth required — returns dashboard if is_public=True."""
    d = await _get_dashboard_or_404(dashboard_id, user=None, db=db, public_ok=True)
    data = _dashboard_to_read(d)
    data["widgets"] = [_widget_to_dict(w) for w in d.widgets]
    return data
