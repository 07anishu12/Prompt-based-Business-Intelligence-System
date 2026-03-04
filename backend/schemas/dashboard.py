from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class DashboardCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None


class DashboardUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    settings: Optional[dict] = None


class DashboardRead(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    layout: dict
    settings: dict
    is_public: bool
    widget_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardDetail(DashboardRead):
    widgets: list[Any] = Field(default_factory=list)


class LayoutItem(BaseModel):
    id: str
    x: int
    y: int
    w: int
    h: int


class LayoutUpdate(BaseModel):
    widgets: list[LayoutItem]
