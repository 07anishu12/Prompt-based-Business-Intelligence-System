"""Main Prompt Engine orchestrator — converts natural language to widgets."""

from __future__ import annotations

import uuid

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.services.llm_client import get_llm_client
from backend.models.query_log import QueryLog
from backend.models.widget import Widget
from backend.schemas.prompt import PromptRequest, PromptResponse, QueryInfo
from backend.services.connectors.factory import ConnectorFactory
from backend.services.prompt_engine import (
    chart_recommender,
    intent_classifier,
    prompt_optimizer,
    query_generator,
    schema_context,
    widget_builder,
)
from backend.utils.encryption import decrypt_config
from backend.utils.sql_validator import UnsafeQueryError, validate_sql


class PromptEngine:
    def _get_claude(self):
        """Return the LLM client (OpenRouter adapter)."""
        return get_llm_client()

    async def process_prompt(
        self,
        request: PromptRequest,
        user_id: str,
        db_session: AsyncSession,
    ) -> PromptResponse:
        """Full pipeline: NL prompt → classified intent → SQL → execution → widget."""
        # 1. Classify intent
        claude = self._get_claude()
        intent = await intent_classifier.classify_with_fallback(
            request.prompt, claude
        )
        logger.info(f"Intent: {intent}")

        # 2. Build schema context
        conn_ids = [request.connection_id] if request.connection_id else []
        schema_ctx = await schema_context.build_context(
            conn_ids, db_session, prompt=request.prompt
        )

        # 3. Optimize prompt (reduce hallucination)
        optimized_prompt = prompt_optimizer.optimize_prompt(
            request.prompt, schema_ctx, intent
        )

        # 4. Generate SQL via LLM
        generation = await query_generator.generate(
            optimized_prompt, schema_ctx, intent, claude
        )

        # 4. Validate SQL
        try:
            validate_sql(generation.sql)
        except UnsafeQueryError as e:
            await self._log_query(
                db_session, user_id, request, intent,
                generation.sql, error=str(e)
            )
            raise

        # 5. Execute query via connector
        query_result_rows: list[dict] = []
        execution_ms = 0
        query_error: str | None = None
        if request.connection_id:
            from backend.models.connection import DataConnection
            from sqlalchemy import select

            conn_uuid = uuid.UUID(request.connection_id)
            result = await db_session.execute(
                select(DataConnection).where(DataConnection.id == conn_uuid)
            )
            db_conn = result.scalar_one_or_none()
            if db_conn:
                config = decrypt_config(db_conn.config, settings.JWT_SECRET)
                connector = ConnectorFactory.create(db_conn.type, config)
                try:
                    qr = await connector.execute_query(
                        generation.sql, generation.params or None
                    )
                    query_result_rows = qr.rows
                    execution_ms = qr.execution_ms
                except Exception as exec_err:
                    query_error = str(exec_err)
                    logger.warning(f"Query execution failed: {exec_err}")
                    # Don't re-raise — we'll handle gracefully below
                finally:
                    await connector.disconnect()

        # 6. Data validation — ensure results are usable
        if query_error:
            # Query failed (likely hallucinated column/table names)
            # Return a widget with empty data and the error as explanation
            logger.error(f"Query execution error: {query_error}")
            query_result_rows = []
            generation.explanation = (
                f"Query could not be executed. {query_error}. "
                "Try rephrasing your question."
            )
        elif not query_result_rows:
            logger.warning("Query returned no rows")

        if query_result_rows and generation.chart_config:
            generation.chart_config = _validate_and_fix_chart_config(
                generation.chart_config, query_result_rows
            )

        # 7. Recommend chart type (may override LLM's suggestion)
        recommended_chart = chart_recommender.recommend(
            query_result_rows, intent=intent
        )
        # Override Claude's suggestion only when data shape clearly indicates
        # a specific type (kpi, line, scatter). For ambiguous cases, trust Claude.
        _high_confidence_overrides = {"kpi", "line", "scatter"}
        if recommended_chart in _high_confidence_overrides:
            chart_type = recommended_chart
        else:
            chart_type = generation.chart_type

        # 7. Build widget
        widget_result = widget_builder.build_widget(
            prompt=request.prompt,
            query_result=query_result_rows,
            chart_type=chart_type,
            chart_config=generation.chart_config,
            title=generation.title,
            explanation=generation.explanation,
            connection_id=request.connection_id,
            dashboard_id=request.dashboard_id,
            sql=generation.sql,
            params=generation.params,
        )

        # 8. Log query
        await self._log_query(
            db_session, user_id, request, intent,
            generation.sql, execution_ms=execution_ms,
            row_count=len(query_result_rows),
        )

        # 9. If dashboard_id provided, persist widget to DB
        if request.dashboard_id:
            db_widget = Widget(
                dashboard_id=uuid.UUID(request.dashboard_id),
                connection_id=uuid.UUID(request.connection_id) if request.connection_id else None,
                type=chart_type,
                title=generation.title,
                prompt_used=request.prompt,
                query_config={"sql": generation.sql, "params": generation.params or []},
                chart_config=widget_result.chart_config.model_dump(),
                layout_position=widget_result.layout_position.model_dump(),
                cached_data={"rows": query_result_rows},
            )
            db_session.add(db_widget)
            await db_session.flush()
            await db_session.refresh(db_widget)
            widget_result.id = str(db_widget.id)

        # 10. Build response
        return PromptResponse(
            widget=widget_result,
            query_info=QueryInfo(
                sql=generation.sql,
                params=generation.params or [],
                execution_ms=execution_ms,
                row_count=len(query_result_rows),
            ),
            explanation=generation.explanation,
        )

    async def _log_query(
        self,
        db_session: AsyncSession,
        user_id: str,
        request: PromptRequest,
        intent: str,
        sql: str,
        execution_ms: int = 0,
        row_count: int = 0,
        error: str | None = None,
    ) -> None:
        log = QueryLog(
            user_id=uuid.UUID(user_id),
            connection_id=uuid.UUID(request.connection_id) if request.connection_id else None,
            prompt=request.prompt,
            generated_query=sql,
            intent=intent,
            execution_ms=execution_ms,
            row_count=row_count,
            error=error,
        )
        db_session.add(log)
        await db_session.flush()

    async def modify_prompt(
        self,
        *,
        original_sql: str,
        modification_prompt: str,
        connection_id: str | None,
        dashboard_id: str | None,
        user_id: str,
        db_session: AsyncSession,
    ) -> PromptResponse:
        """Modify an existing query — skips intent classification, sends original
        SQL context directly to the query generator so Claude can refine it."""
        claude = self._get_claude()

        # Skip intent classifier — this is always a "modify/refine" intent
        intent = "modify"

        # Build schema context
        conn_ids = [connection_id] if connection_id else []
        schema_ctx = await schema_context.build_context(
            conn_ids, db_session, prompt=modification_prompt
        )

        # Compose a prompt that gives Claude the original SQL + the modification
        combined_prompt = (
            f"Here is an existing SQL query:\n```sql\n{original_sql}\n```\n\n"
            f"Modify it as follows: {modification_prompt}"
        )

        generation = await query_generator.generate(
            combined_prompt, schema_ctx, intent, claude
        )

        # Validate
        try:
            validate_sql(generation.sql)
        except UnsafeQueryError as e:
            fake_req = PromptRequest(
                prompt=modification_prompt,
                connection_id=connection_id,
                dashboard_id=dashboard_id,
            )
            await self._log_query(
                db_session, user_id, fake_req, intent,
                generation.sql, error=str(e)
            )
            raise

        # Execute
        query_result_rows: list[dict] = []
        execution_ms = 0
        if connection_id:
            from backend.models.connection import DataConnection
            from sqlalchemy import select as sa_select

            conn_uuid = uuid.UUID(connection_id)
            result = await db_session.execute(
                sa_select(DataConnection).where(DataConnection.id == conn_uuid)
            )
            db_conn = result.scalar_one_or_none()
            if db_conn:
                config = decrypt_config(db_conn.config, settings.JWT_SECRET)
                connector = ConnectorFactory.create(db_conn.type, config)
                try:
                    qr = await connector.execute_query(
                        generation.sql, generation.params or None
                    )
                    query_result_rows = qr.rows
                    execution_ms = qr.execution_ms
                except Exception as exec_err:
                    logger.warning(f"Modify query execution failed: {exec_err}")
                    generation.explanation = (
                        f"Query could not be executed. {exec_err}. "
                        "Try rephrasing your modification."
                    )
                finally:
                    await connector.disconnect()

        # Validate chart config against actual data
        if query_result_rows and generation.chart_config:
            generation.chart_config = _validate_and_fix_chart_config(
                generation.chart_config, query_result_rows
            )

        chart_type = generation.chart_type

        widget_result = widget_builder.build_widget(
            prompt=modification_prompt,
            query_result=query_result_rows,
            chart_type=chart_type,
            chart_config=generation.chart_config,
            title=generation.title,
            explanation=generation.explanation,
            connection_id=connection_id,
            dashboard_id=dashboard_id,
            sql=generation.sql,
            params=generation.params,
        )

        # Log
        fake_req = PromptRequest(
            prompt=modification_prompt,
            connection_id=connection_id,
            dashboard_id=dashboard_id,
        )
        await self._log_query(
            db_session, user_id, fake_req, intent,
            generation.sql, execution_ms=execution_ms,
            row_count=len(query_result_rows),
        )

        return PromptResponse(
            widget=widget_result,
            query_info=QueryInfo(
                sql=generation.sql,
                params=generation.params or [],
                execution_ms=execution_ms,
                row_count=len(query_result_rows),
            ),
            explanation=generation.explanation,
        )


def _validate_and_fix_chart_config(
    chart_config: dict, rows: list[dict]
) -> dict:
    """Validate chart_config fields against actual query result columns.
    Auto-fix mismatches to prevent 'unsupported widget' errors on the frontend."""
    if not rows:
        return chart_config

    actual_cols = set(rows[0].keys())
    x_field = chart_config.get("x_field", "")
    y_fields = chart_config.get("y_fields", [])

    # Classify actual columns by type
    sample_row = rows[0]
    string_cols = [
        c for c in actual_cols
        if isinstance(sample_row.get(c), str)
    ]
    numeric_cols = [
        c for c in actual_cols
        if isinstance(sample_row.get(c), (int, float))
    ]

    # Build case-insensitive lookup
    lower_map = {c.lower(): c for c in actual_cols}

    # Auto-fix x_field if it doesn't match
    if x_field and x_field not in actual_cols:
        if x_field.lower() in lower_map:
            chart_config["x_field"] = lower_map[x_field.lower()]
            logger.info(f"Auto-fixed x_field (case): '{x_field}' → '{lower_map[x_field.lower()]}'")
        elif string_cols:
            chart_config["x_field"] = string_cols[0]
            logger.info(f"Auto-fixed x_field: '{x_field}' → '{string_cols[0]}'")
        elif actual_cols:
            non_numeric = [c for c in actual_cols if c not in numeric_cols]
            chart_config["x_field"] = non_numeric[0] if non_numeric else list(actual_cols)[0]
            logger.info(f"Auto-fixed x_field: '{x_field}' → '{chart_config['x_field']}'")

    # Auto-fix y_fields if they don't match
    if y_fields:
        valid_y = [f for f in y_fields if f in actual_cols]
        if not valid_y:
            # Try case-insensitive match
            valid_y = [lower_map[f.lower()] for f in y_fields if f.lower() in lower_map]

        if not valid_y and numeric_cols:
            valid_y = numeric_cols[:3]
            logger.info(f"Auto-fixed y_fields: {y_fields} → {valid_y}")

        if valid_y:
            chart_config["y_fields"] = valid_y
    elif numeric_cols:
        chart_config["y_fields"] = numeric_cols[:3]

    return chart_config
