"""Validate generated SQL to ensure only safe SELECT queries are executed."""

from __future__ import annotations

import re

import sqlparse


class UnsafeQueryError(Exception):
    """Raised when SQL contains dangerous operations."""


_DANGEROUS_FUNCTIONS = re.compile(
    r"\b(pg_sleep|pg_read_file|lo_import|lo_export|"
    r"pg_ls_dir|pg_stat_file|dblink|COPY|"
    r"xp_cmdshell|sp_executesql|exec\s*\()\b",
    re.IGNORECASE,
)

_WRITE_STATEMENTS = {"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE"}


def validate_sql(sql: str) -> bool:
    """Validate that SQL is a safe read-only query.

    Returns True if valid, raises UnsafeQueryError otherwise.
    """
    stripped = sql.strip().rstrip(";")

    # No multiple statements (prevent injection)
    if ";" in stripped:
        raise UnsafeQueryError("Multiple SQL statements are not allowed")

    # Parse with sqlparse
    parsed = sqlparse.parse(stripped)
    if not parsed:
        raise UnsafeQueryError("Could not parse SQL statement")

    stmt = parsed[0]
    stmt_type = stmt.get_type()

    # Only SELECT (and WITH ... SELECT) allowed
    if stmt_type and stmt_type.upper() not in ("SELECT", "UNKNOWN"):
        raise UnsafeQueryError(f"Only SELECT queries are allowed, got: {stmt_type}")

    # Check for write keywords in the raw SQL
    tokens_upper = stripped.upper()
    for kw in _WRITE_STATEMENTS:
        # Match as whole word
        if re.search(rf"\b{kw}\b", tokens_upper):
            raise UnsafeQueryError(f"Forbidden keyword detected: {kw}")

    # Check for dangerous functions
    if _DANGEROUS_FUNCTIONS.search(stripped):
        raise UnsafeQueryError("Dangerous function detected in query")

    return True
