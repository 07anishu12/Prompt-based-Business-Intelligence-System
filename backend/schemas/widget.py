import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ChartConfig(BaseModel):
    x_field: str
    y_fields: list[str]
    group_field: Optional[str] = None
    aggregation: str = "sum"
    colors: list[str] = Field(default_factory=list)
    stacked: bool = False
    show_values: bool = True
    orientation: str = "vertical"
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    metric_name: Optional[str] = None
    card_description: Optional[str] = None
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    show_legend: bool = True
    show_tooltip: bool = True
    show_grid: bool = True
    histogram_bins: Optional[int] = None
    style_config: dict[str, Any] = Field(default_factory=dict)
    metric_config: dict[str, Any] = Field(default_factory=dict)

    model_config = {"extra": "allow"}


class LayoutPosition(BaseModel):
    x: int
    y: int
    w: int
    h: int
    min_w: int = 2
    min_h: int = 2
    position: Optional[int] = None


class WidgetCreate(BaseModel):
    dashboard_id: str
    type: str
    title: Optional[str] = None
    connection_id: Optional[str] = None
    query_config: dict
    chart_config: dict
    layout_position: dict


class WidgetRead(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    type: str
    title: Optional[str] = None
    prompt_used: Optional[str] = None
    chart_config: dict
    layout_position: dict
    data: Optional[list[dict[str, Any]]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WidgetUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    chart_config: Optional[dict] = None
    layout_position: Optional[dict] = None
