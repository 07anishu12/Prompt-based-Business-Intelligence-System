"""Assemble a complete widget from query results and chart configuration."""

from __future__ import annotations

from typing import Any

from backend.schemas.prompt import WidgetResult
from backend.schemas.widget import ChartConfig, LayoutPosition

# Default color palette (8 colors — vibrant but distinct)
DEFAULT_COLORS = [
    "#6366F1",  # indigo
    "#F59E0B",  # amber
    "#10B981",  # emerald
    "#EF4444",  # red
    "#3B82F6",  # blue
    "#8B5CF6",  # violet
    "#EC4899",  # pink
    "#14B8A6",  # teal
]

# Default layout sizes by widget type
_DEFAULT_LAYOUTS: dict[str, dict[str, int]] = {
    "kpi": {"w": 3, "h": 2, "min_w": 2, "min_h": 2},
    "table": {"w": 12, "h": 6, "min_w": 4, "min_h": 3},
    "bar": {"w": 6, "h": 4, "min_w": 3, "min_h": 3},
    "line": {"w": 6, "h": 4, "min_w": 3, "min_h": 3},
    "pie": {"w": 4, "h": 4, "min_w": 3, "min_h": 3},
    "scatter": {"w": 6, "h": 4, "min_w": 3, "min_h": 3},
}


def _detect_number_format(values: list) -> str:
    """Detect if values look like currency, percentage, or plain numbers."""
    if not values:
        return "number"
    sample = values[0]
    if isinstance(sample, str):
        if "%" in sample:
            return "percent"
        if "$" in sample or "€" in sample or "£" in sample:
            return "currency"
    if isinstance(sample, (int, float)):
        if 0 < abs(sample) < 1:
            return "percent"
        if abs(sample) > 1_000_000:
            return "compact"
    return "number"


def _find_next_position(existing_positions: list[dict]) -> tuple[int, int]:
    """Find the next open grid slot (12-column grid)."""
    if not existing_positions:
        return 0, 0

    max_y = 0
    max_y_bottom = 0
    for pos in existing_positions:
        bottom = pos.get("y", 0) + pos.get("h", 4)
        if bottom > max_y_bottom:
            max_y_bottom = bottom
            max_y = pos.get("y", 0)

    # Place below the last widget
    return 0, max_y_bottom


def build_widget(
    prompt: str,
    query_result: list[dict[str, Any]],
    chart_type: str,
    chart_config: dict,
    title: str,
    explanation: str,
    connection_id: str | None = None,
    dashboard_id: str | None = None,
    existing_positions: list[dict] | None = None,
    sql: str = "",
    params: list | None = None,
) -> WidgetResult:
    """Assemble the complete widget with layout, colors, and formatting."""
    # Chart config
    x_field = chart_config.get("x_field", "")
    y_fields = chart_config.get("y_fields", [])
    group_field = chart_config.get("group_field")

    colors = DEFAULT_COLORS[: max(len(y_fields), 1)]

    widget_chart_config = ChartConfig(
        x_field=x_field,
        y_fields=y_fields,
        group_field=group_field,
        aggregation=chart_config.get("aggregation", "sum"),
        colors=colors,
        stacked=chart_config.get("stacked", False),
        show_values=True,
        orientation=chart_config.get("orientation", "vertical"),
    )

    # Layout position
    layout_defaults = _DEFAULT_LAYOUTS.get(chart_type, _DEFAULT_LAYOUTS["bar"])
    x, y = _find_next_position(existing_positions or [])
    layout = LayoutPosition(
        x=x,
        y=y,
        w=layout_defaults["w"],
        h=layout_defaults["h"],
        min_w=layout_defaults["min_w"],
        min_h=layout_defaults["min_h"],
    )

    # Query config (stored so widget can be refreshed later)
    query_config = {"sql": sql, "params": params or [], "connection_id": connection_id}

    return WidgetResult(
        type=chart_type,
        title=title,
        prompt_used=prompt,
        query_config=query_config,
        chart_config=widget_chart_config,
        layout_position=layout,
        data=query_result,
        explanation=explanation,
    )
