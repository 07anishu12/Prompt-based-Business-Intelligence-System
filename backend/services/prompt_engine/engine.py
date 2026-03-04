"""Main Prompt Engine orchestrator — converts natural language to widgets."""

from __future__ import annotations

import time
import uuid

import anthropic
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.query_log import QueryLog
from backend.models.widget import Widget
from backend.schemas.prompt import PromptRequest, PromptResponse, QueryInfo
from backend.services.connectors.factory import ConnectorFactory
from backend.services.prompt_engine import (
    chart_recommender,
    intent_classifier,
    query_generator,
    schema_context,
    widget_builder,
)
from backend.utils.encryption import decrypt_config
from backend.utils.sql_validator import UnsafeQueryError, validate_sql


class PromptEngine:
    def __init__(self) -> None:
        self._claude: anthropic.AsyncAnthropic | None = None

    def _get_claude(self) -> anthropic.AsyncAnthropic:
        """Lazy init — avoids crash if ANTHROPIC_API_KEY isn't set at import time."""
        if self._claude is None:
            self._claude = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._claude

    async def process_prompt(
        self,
        request: PromptRequest,
        user_id: str,
        db_session: AsyncSession,
    ) -> PromptResponse:
        """Full pipeline: NL prompt → classified intent → SQL → execution → widget."""
        start = time.perf_counter()

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

        # 3. Generate SQL via Claude
        generation = await query_generator.generate(
            request.prompt, schema_ctx, intent, claude
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
        if request.connection_id:
            from backend.models.connection import DataConnection
            from sqlalchemy import select

            conn_uuid = uuid.UUID(request.connection_id)
            result = await db_session.execute(
                select(DataConnection).where(DataConnection.id == conn_uuid)
            )
            db_conn = result.scalar_one_or_none()
            if db_conn:
                config = decrypt_config(
                    db_conn.config if isinstance(db_conn.config, str) else db_conn.config,
                    settings.JWT_SECRET,
                )
                connector = ConnectorFactory.create(db_conn.type, config)
                try:
                    qr = await connector.execute_query(
                        generation.sql, generation.params or None
                    )
                    query_result_rows = qr.rows
                    execution_ms = qr.execution_ms
                finally:
                    await connector.disconnect()

        total_ms = int((time.perf_counter() - start) * 1000)

        # 6. Recommend chart type (may override Claude's suggestion)
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
