from __future__ import annotations

import pytest
from httpx import AsyncClient


def _chart_config(**overrides):
    config = {
        "x_field": "month",
        "y_fields": ["revenue"],
        "aggregation": "sum",
        "colors": ["#2563eb"],
        "stacked": False,
        "show_values": True,
        "orientation": "vertical",
        "metric_name": "revenue",
        "x_axis_label": "Month",
        "y_axis_label": "Revenue",
        "card_description": "Monthly revenue trend",
        "metric_config": {
            "field": "revenue",
            "aggregation": "sum",
            "visible_metrics": ["sum", "average"],
        },
        "style_config": {
            "background_type": "solid",
            "background_color": "#ffffff",
        },
    }
    config.update(overrides)
    return config


async def _create_dashboard(client: AsyncClient) -> str:
    response = await client.post(
        "/api/dashboards",
        json={"title": "Feature Audit Dashboard"},
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _create_widget(
    client: AsyncClient,
    dashboard_id: str,
    *,
    title: str,
    layout_position: dict,
    chart_config: dict | None = None,
):
    response = await client.post(
        "/api/widgets",
        json={
            "dashboard_id": dashboard_id,
            "type": "bar",
            "title": title,
            "query_config": {"sql": "SELECT 1", "params": []},
            "chart_config": chart_config or _chart_config(),
            "layout_position": layout_position,
        },
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_widget_creation_and_duplication_assign_positions(client: AsyncClient):
    dashboard_id = await _create_dashboard(client)

    first = await _create_widget(
        client,
        dashboard_id,
        title="Revenue",
        layout_position={"x": 0, "y": 0, "w": 6, "h": 4},
    )
    second = await _create_widget(
        client,
        dashboard_id,
        title="Profit",
        layout_position={"x": 6, "y": 0, "w": 6, "h": 4},
    )

    duplicate_response = await client.post(f"/api/widgets/{first['id']}/duplicate")
    assert duplicate_response.status_code == 201
    duplicate = duplicate_response.json()

    assert first["layout_position"]["position"] == 0
    assert second["layout_position"]["position"] == 1
    assert duplicate["layout_position"]["position"] == 2


@pytest.mark.asyncio
async def test_dashboard_layout_updates_persist_widget_order(client: AsyncClient):
    dashboard_id = await _create_dashboard(client)

    first = await _create_widget(
        client,
        dashboard_id,
        title="Revenue",
        layout_position={"x": 0, "y": 0, "w": 6, "h": 4},
    )
    second = await _create_widget(
        client,
        dashboard_id,
        title="Profit",
        layout_position={"x": 6, "y": 0, "w": 6, "h": 4},
    )

    response = await client.put(
        f"/api/dashboards/{dashboard_id}/layout",
        json={
            "widgets": [
                {"id": second["id"], "x": 0, "y": 0, "w": 6, "h": 4, "position": 0},
                {"id": first["id"], "x": 6, "y": 0, "w": 6, "h": 4, "position": 1},
            ]
        },
    )
    assert response.status_code == 200

    dashboard_response = await client.get(f"/api/dashboards/{dashboard_id}")
    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.json()

    assert [widget["id"] for widget in dashboard["widgets"]] == [second["id"], first["id"]]
    assert [widget["layout_position"]["position"] for widget in dashboard["widgets"]] == [0, 1]


@pytest.mark.asyncio
async def test_widget_update_merges_layout_and_chart_extensions(client: AsyncClient):
    dashboard_id = await _create_dashboard(client)
    widget = await _create_widget(
        client,
        dashboard_id,
        title="Revenue",
        layout_position={"x": 0, "y": 0, "w": 6, "h": 4},
    )

    response = await client.put(
        f"/api/widgets/{widget['id']}",
        json={
            "type": "radar",
            "layout_position": {"x": 3},
            "chart_config": _chart_config(
                x_axis_label="Month label",
                y_axis_label="Revenue label",
                card_description="Updated from the editor panel",
                style_config={
                    "background_type": "gradient",
                    "gradient_from": "#0f172a",
                    "gradient_to": "#1d4ed8",
                },
            ),
        },
    )
    assert response.status_code == 200

    updated = response.json()
    assert updated["type"] == "radar"
    assert updated["layout_position"]["x"] == 3
    assert updated["layout_position"]["y"] == 0
    assert updated["layout_position"]["position"] == 0
    assert updated["chart_config"]["x_axis_label"] == "Month label"
    assert updated["chart_config"]["y_axis_label"] == "Revenue label"
    assert updated["chart_config"]["card_description"] == "Updated from the editor panel"
    assert updated["chart_config"]["style_config"]["background_type"] == "gradient"
