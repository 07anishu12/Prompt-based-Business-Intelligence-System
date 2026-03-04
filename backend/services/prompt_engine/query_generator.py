"""Generate SQL queries from natural language using Claude API."""

from __future__ import annotations

import json
from typing import Any

from loguru import logger
from pydantic import BaseModel, Field

_SYSTEM_PROMPT = """You are a SQL query generator for a Business Intelligence system.
Given a user's natural language request and the database schema below,
generate a response.

DATABASE SCHEMA:
{schema_context}

RULES:
1. Generate ONLY SELECT queries. Never INSERT/UPDATE/DELETE/DROP.
2. Use standard SQL compatible with PostgreSQL.
3. Always alias columns with human-readable names using AS.
4. For time series, ORDER BY date ASC.
5. For rankings/top-N, ORDER BY metric DESC with LIMIT.
6. For KPIs, return exactly one row with the metric.
7. Include GROUP BY when using aggregations.
8. If the request references tables that don't exist in the schema,
   explain what's missing instead of guessing.

Respond ONLY with valid JSON (no markdown):
{{
  "sql": "SELECT ...",
  "params": [],
  "chart_type": "bar",
  "chart_config": {{
    "x_field": "column_alias",
    "y_fields": ["column_alias"],
    "group_field": null,
    "aggregation": "sum",
    "sort_by": "value",
    "sort_order": "desc"
  }},
  "title": "Short Descriptive Title",
  "explanation": "Brief explanation of what this query does"
}}"""


class GeneratedQuery(BaseModel):
    sql: str
    params: list[Any] = Field(default_factory=list)
    chart_type: str = "bar"
    chart_config: dict = Field(default_factory=dict)
    title: str = "Query Result"
    explanation: str = ""


class QueryGenerationError(Exception):
    """Claude couldn't generate a valid query."""


async def generate(
    prompt: str,
    schema_context: str,
    intent: str,
    claude_client,
) -> GeneratedQuery:
    """Call Claude API to generate a SQL query from natural language."""
    system = _SYSTEM_PROMPT.format(schema_context=schema_context)

    user_msg = f"Intent: {intent}\nUser request: {prompt}"

    for attempt in range(2):  # Retry once on malformed response
        try:
            response = await claude_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw_text = response.content[0].text.strip()

            # Strip markdown code fences if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

            data = json.loads(raw_text)
            result = GeneratedQuery.model_validate(data)
            logger.info(f"Query generated: {result.title}")
            return result

        except json.JSONDecodeError:
            if attempt == 0:
                logger.warning("Claude returned non-JSON, retrying...")
                continue
            raise QueryGenerationError(
                f"Claude returned invalid JSON after 2 attempts: {raw_text[:200]}"
            )
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Query generation attempt failed: {e}, retrying...")
                continue
            raise QueryGenerationError(f"Failed to generate query: {e}") from e

    raise QueryGenerationError("Query generation failed after retries")
