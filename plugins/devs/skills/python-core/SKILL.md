---
name: devs:python-core
description: "Use when writing, debugging, reviewing, or architecting Python code — tracebacks, typing and mypy errors, async/asyncio work, pytest testing, FastAPI services, dependency and environment management with uv, packaging, or scaffolding a new Python project. Contains execution-verified references, a version-landmarks table, uv-based scaffolding scripts, and a pyproject policy template."
---

# Python Core Development

Reference hub for Python work. Everything version-sensitive in here was verified against PyPI and Python 3.14 in August 2026 — when in doubt, re-verify (`curl -s https://pypi.org/pypi/<pkg>/json | jq -r .info.version`); never trust trained knowledge for versions or ecosystem APIs.

## Reference routing

Load references on demand — not all at once.

| Reference | Use when |
|---|---|
| [type-hints.md](references/type-hints.md) | Modern typing: PEP 695 generics, TypeIs, Protocol, strict mypy config |
| [async-patterns.md](references/async-patterns.md) | TaskGroup, timeouts, queues, blocking-call escape hatches |
| [testing.md](references/testing.md) | pytest config, fixtures, pytest-asyncio, coverage, async FastAPI tests |
| [fastapi-guide.md](references/fastapi-guide.md) | FastAPI services: lifespan, pydantic v2, SQLAlchemy 2 async, auth, CORS |
| [dependencies.md](references/dependencies.md) | uv workflow, PEP 735 dependency groups, auditing, migration |
| [common-libraries.md](references/common-libraries.md) | Curated library selection with versions, gotchas, and a superseded list |

For code-review checklists use the `devs:code-review` skill; for dependency auditing workflows use `devs:deps-core`.

## Breaking-change landmarks (as of Aug 2026)

Models trained earlier routinely emit the old forms. Do not.

| Area | Landmark |
|---|---|
| Python versions | 3.14 current; 3.9 EOL (Oct 2025); 3.10 EOL Oct 2026. New projects: `requires-python >= 3.12` |
| Typing | PEP 695 since 3.12: `class Box[T]:`, `def f[T]()`, `type X = ...` — no TypeVar boilerplate. Built-in generics + `X \| None`; a stale mypy `python_version` pin rejects the new syntax |
| Packaging | uv is the default manager: `uv init/add/sync/run`, `uv.lock` committed, PEP 735 `[dependency-groups]` for dev tools. `uv pip` is the low-level escape hatch |
| Environments | PEP 668: never install into system Python; never `--break-system-packages` |
| ruff | Lint settings live under `[tool.ruff.lint]` (top-level `select` is deprecated); `ruff format` replaces black+isort |
| asyncio | `asyncio.TaskGroup` + `asyncio.timeout()` (3.11+) over bare gather/`wait_for` |
| datetime | `datetime.now(timezone.utc)` — `utcnow()` is deprecated and returns naive datetimes |
| pydantic | v2 idioms: `field_validator`, `model_config`/`ConfigDict`, `model_dump()`; `Field(pattern=)` not `regex=` |
| FastAPI | `lifespan` context manager, not `@app.on_event`; auth via pwdlib (argon2) + PyJWT — passlib and python-jose are dead |
| Performance | Profile first: py-spy / scalene. `functools.cache` for memoization. 3.13+/3.14 ship free-threaded builds and an experimental JIT — measure, don't assume |

## Decision guides

**Package manager:** uv for anything new. In existing projects, detect from the lockfile (`poetry.lock` → poetry, etc.) and conform — details in [dependencies.md](references/dependencies.md).

**Data modeling:** dataclasses by default; pydantic when runtime validation/serialization is actually needed.

**Sync vs async:** async only for I/O-bound concurrency (servers, fan-out HTTP); CPU-bound work uses processes or `asyncio.to_thread`; simple scripts stay sync. Details: [async-patterns.md](references/async-patterns.md).

**Library selection:** the curated table (with a superseded-do-not-recommend list) in [common-libraries.md](references/common-libraries.md).

## Scripts

- `${CLAUDE_SKILL_DIR}/scripts/init_python_project.sh <name> [package|fastapi]` — scaffold via `uv init` (src layout), append the `[tool.*]` policy tables, dev tools in the PEP 735 dev group, starter test; self-verifies with ruff + mypy + pytest before reporting success.
- `${CLAUDE_SKILL_DIR}/scripts/setup_logging.sh` — `uv add structlog` plus a `logging_config.py` (console on TTY, JSON otherwise); refuses to overwrite an existing one.
- `${CLAUDE_SKILL_DIR}/scripts/audit_dependencies.sh` — pip-audit over the `uv export`ed lockfile (ephemeral via uvx — nothing installed into any environment) plus `uv tree --outdated`; non-zero exit on findings.

## Config template (`${CLAUDE_SKILL_DIR}/assets/configs/`)

- `pyproject-tools.toml` — the `[tool.ruff]`/`[tool.ruff.lint]`/`[tool.mypy]`/`[tool.pytest.ini_options]` policy tables, designed to be appended to a `uv init` pyproject (curated ruff select, mypy strict, no stale version pins). Not a complete pyproject on its own.
