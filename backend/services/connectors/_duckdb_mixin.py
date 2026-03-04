"""Shared DuckDB logic for file-based connectors (CSV, Excel, JSON)."""

from __future__ import annotations

import time
from typing import Any

import duckdb
from loguru import logger

from backend.schemas.connection import ColumnMetadata, SchemaMetadata, TableMetadata
from backend.services.connectors.base import QueryError, QueryResult


class DuckDBMixin:
    """Mixin providing DuckDB-backed query execution for file connectors.

    Subclasses must define a `_load()` method that populates data into DuckDB.
    """

    _duckdb: duckdb.DuckDBPyConnection | None = None
    _table_names: list[str] = []

    def _ensure_loaded(self) -> None:
        """Ensure data is loaded before queries. Calls _load() if available."""
        if hasattr(self, "_loaded") and not self._loaded:
            if hasattr(self, "_load"):
                self._load()

    def _init_duckdb(self) -> duckdb.DuckDBPyConnection:
        if self._duckdb is None:
            self._duckdb = duckdb.connect(":memory:")
        return self._duckdb

    def _register_dataframe(self, table_name: str, df: Any) -> None:
        """Register a pandas DataFrame as a DuckDB table."""
        conn = self._init_duckdb()
        conn.register(table_name, df)
        if table_name not in self._table_names:
            self._table_names.append(table_name)

    async def get_schema(self) -> SchemaMetadata:
        self._ensure_loaded()
        conn = self._init_duckdb()
        tables: list[TableMetadata] = []

        for table_name in self._table_names:
            # Get column info from DuckDB
            col_info = conn.execute(f"DESCRIBE \"{table_name}\"").fetchall()
            row_count = conn.execute(f"SELECT COUNT(*) FROM \"{table_name}\"").fetchone()[0]

            columns: list[ColumnMetadata] = []
            for col_row in col_info:
                col_name = col_row[0]
                col_type = col_row[1]

                # Get sample values
                samples: list[str] = []
                try:
                    sample_rows = conn.execute(
                        f'SELECT DISTINCT "{col_name}" FROM "{table_name}" '
                        f'WHERE "{col_name}" IS NOT NULL LIMIT 5'
                    ).fetchall()
                    samples = [str(r[0]) for r in sample_rows]
                except Exception:
                    pass

                columns.append(
                    ColumnMetadata(
                        name=col_name,
                        type=col_type,
                        sample_values=samples,
                    )
                )

            tables.append(
                TableMetadata(name=table_name, columns=columns, row_count=row_count)
            )

        return SchemaMetadata(tables=tables)

    async def execute_query(self, sql: str, params: list | None = None) -> QueryResult:
        self._ensure_loaded()
        conn = self._init_duckdb()
        start = time.perf_counter()
        try:
            if params:
                result = conn.execute(sql, params)
            else:
                result = conn.execute(sql)
            raw_rows = result.fetchall()
            col_names = [desc[0] for desc in result.description]
        except Exception as e:
            raise QueryError(f"DuckDB query failed: {e}") from e

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        rows = [dict(zip(col_names, r)) for r in raw_rows]

        return QueryResult(
            columns=col_names,
            rows=rows,
            row_count=len(rows),
            execution_ms=elapsed_ms,
        )

    async def get_sample_data(self, table: str, limit: int = 20) -> list[dict]:
        result = await self.execute_query(f'SELECT * FROM "{table}" LIMIT {limit}')
        return result.rows

    async def disconnect(self) -> None:
        if self._duckdb:
            self._duckdb.close()
            self._duckdb = None
            self._table_names = []
            logger.debug("DuckDB connection closed")
