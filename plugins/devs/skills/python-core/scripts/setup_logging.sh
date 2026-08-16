#!/usr/bin/env bash
set -euo pipefail

# Add structlog-based logging to the current uv-managed project. Refuses to
# overwrite an existing logging_config.py. Never installs into the system
# Python (PEP 668) — the dependency is added via `uv add`.

if [[ ! -f pyproject.toml ]]; then
    echo "No pyproject.toml in $(pwd) — run from the project root." >&2
    exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
    echo "uv is required (https://docs.astral.sh/uv/ — brew install uv)" >&2
    exit 1
fi
if [[ -e logging_config.py ]]; then
    echo "logging_config.py already exists — refusing to overwrite it." >&2
    exit 1
fi

echo "Adding structlog..."
uv add structlog

cat > logging_config.py <<'PY'
"""Structlog configuration. Call configure_logging() once at startup."""

import os
import sys

import structlog


def configure_logging() -> None:
    """Console renderer on a TTY, JSON otherwise; LOG_FORMAT=json forces JSON."""
    force_json = os.environ.get("LOG_FORMAT") == "json"
    renderer: structlog.typing.Processor
    if force_json or not sys.stderr.isatty():
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.format_exc_info,
            renderer,
        ],
    )
PY

echo "✅ Logging module created at logging_config.py."
echo ""
echo "Wire it up at startup:"
echo "  from logging_config import configure_logging"
echo "  configure_logging()"
echo "  logger = structlog.get_logger()"
echo ""
echo "LOG_FORMAT=json forces JSON output (also the default when not on a TTY)."
