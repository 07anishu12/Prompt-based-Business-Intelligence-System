"""Classify user prompts into intent categories.

Fast-path: keyword matching. Fallback: Claude API call.
"""

from __future__ import annotations

import re

from loguru import logger

# Intent types returned by the classifier
INTENTS = (
    "create_chart",
    "create_table",
    "create_kpi",
    "create_filter",
    "modify_widget",
    "ask_question",
)

# Keyword → intent mapping (checked in order)
_KEYWORD_RULES: list[tuple[list[str], str]] = [
    (["change", "modify", "update", "make it", "adjust", "edit"], "modify_widget"),
    (["filter", "filter by", "segment", "where", "narrow down"], "create_filter"),
    (
        ["chart", "graph", "plot", "visualize", "trend", "bar", "line", "pie", "scatter", "histogram"],
        "create_chart",
    ),
    (["table", "list", "show all", "show data", "display all", "all rows"], "create_table"),
    (
        ["total", "count", "average", "how many", "sum", "max", "min", "median", "percentage"],
        "create_kpi",
    ),
]


def classify(prompt: str) -> str:
    """Classify a prompt into an intent via keyword matching."""
    lower = prompt.lower()

    for keywords, intent in _KEYWORD_RULES:
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", lower):
                logger.debug(f"Intent classified (keyword '{kw}'): {intent}")
                return intent

    # Default: treat as a question / chart request
    logger.debug("Intent classified (default): ask_question")
    return "ask_question"


async def classify_with_fallback(prompt: str, claude_client) -> str:
    """Try keyword matching first, fall back to Claude for ambiguous prompts."""
    intent = classify(prompt)
    if intent != "ask_question":
        return intent

    # Fallback: ask Claude to classify
    try:
        response = await claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            system="Classify the user's BI prompt into exactly one category. "
            "Reply with ONLY the category name, nothing else.\n"
            "Categories: create_chart, create_table, create_kpi, create_filter, "
            "modify_widget, ask_question",
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.content[0].text.strip().lower().replace(" ", "_")
        if result in INTENTS:
            logger.debug(f"Intent classified (Claude fallback): {result}")
            return result
    except Exception as e:
        logger.warning(f"Claude intent classification failed: {e}")

    return intent
