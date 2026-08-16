---
name: devs:python-core
description: "Use when writing, debugging, reviewing, or architecting Python code — tracebacks, typing and mypy errors, async/asyncio work, pytest testing, FastAPI services, dependency and environment management with uv, packaging, or scaffolding a new Python project. Contains execution-verified references, uv-based scaffolding scripts, and a pyproject policy template."
---

# Python Core Development

Reference hub for Python work. Verify versions and APIs against PyPI (`curl -s https://pypi.org/pypi/<pkg>/json | jq -r .info.version`) and the installed interpreter — never from trained knowledge.

## Reference routing

Load references on demand — not all at once.

| Reference | Use when |
|---|---|
| [type-hints.md](references/type-hints.md) | Modern typing: PEP 695 generics, TypeIs, Protocol, strict mypy config |
| [async-patterns.md](references/async-patterns.md) | TaskGroup, timeouts, queues, blocking-call escape hatches |
| [testing.md](references/testing.md) | pytest config, fixtures, pytest-asyncio, coverage, async FastAPI tests |
| [fastapi-guide.md](references/fastapi-guide.md) | FastAPI services: lifespan, pydantic v2, SQLAlchemy 2 async, auth, CORS |
| [dependencies.md](references/dependencies.md) | uv workflow, PEP 735 dependency groups, auditing, moving a project to uv |
| [common-libraries.md](references/common-libraries.md) | Curated library selection with versions, gotchas, and a do-not-use list |

For code-review checklists use the `devs:code-review` skill; for dependency auditing workflows use `devs:deps-core`.

## Decision guides

**Package manager:** uv for anything new. In existing projects, detect from the lockfile (`poetry.lock` → poetry, etc.) and conform — details in [dependencies.md](references/dependencies.md).

**Data modeling:** dataclasses by default; pydantic when runtime validation/serialization is actually needed.

**Sync vs async:** async only for I/O-bound concurrency (servers, fan-out HTTP); CPU-bound work uses processes or `asyncio.to_thread`; simple scripts stay sync. Details: [async-patterns.md](references/async-patterns.md).

**Library selection:** the curated table (with a do-not-use list) in [common-libraries.md](references/common-libraries.md).

**Performance:** profile first (py-spy, scalene); `functools.cache` for memoization.

## Scripts

- `${CLAUDE_SKILL_DIR}/scripts/init_python_project.sh <name> [package|fastapi]` — scaffold via `uv init` (src layout), append the `[tool.*]` policy tables, dev tools in the PEP 735 dev group, starter test; self-verifies with ruff + mypy + pytest before reporting success.
- `${CLAUDE_SKILL_DIR}/scripts/setup_logging.sh` — `uv add structlog` plus a `logging_config.py` (console on TTY, JSON otherwise); refuses to overwrite an existing one.
- `${CLAUDE_SKILL_DIR}/scripts/audit_dependencies.sh` — `uv audit` (falling back with instructions when the installed uv predates it) plus `uv tree --outdated`; non-zero exit on findings or when the vulnerability check cannot run.

## Config template (`${CLAUDE_SKILL_DIR}/assets/configs/`)

- `pyproject-tools.toml` — the `[tool.ruff]`/`[tool.ruff.lint]`/`[tool.mypy]`/`[tool.pytest.ini_options]` policy tables, designed to be appended to a `uv init` pyproject (curated ruff select, mypy strict, no stale version pins). Not a complete pyproject on its own.
