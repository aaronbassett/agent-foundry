# Python Library Choices

Hand-curated defaults. Check maintenance before adding anything: a library with no release in 18+ months needs a strong reason.

## Core

| Library | Version | Use when | Gotcha |
|---|---|---|---|
| httpx | 0.28.1 | Any HTTP client work, sync or async | 5 s default timeout; `raise_for_status()` is not automatic. Stable API; 1.0 is in pre-release |
| pydantic | 2.13.4 | Validation/serialization at boundaries | v1 API (`.dict()`, `.parse_obj()`) is gone — use `model_dump`/`model_validate` |
| pydantic-settings | 2.15.0 | Typed config from env vars/.env | Separate package since v2; nested env vars need `env_nested_delimiter` |
| structlog | 26.1.0 | Structured (JSON) application logging | Route stdlib `logging` into it, or third-party logs bypass your pipeline |
| rich | 15.0.0 | Terminal output, tracebacks, progress | Markup parses `[...]` — escape untrusted strings |
| typer | 0.27.1 | CLIs — the default: type-hint-native, built on click | Use `Annotated[...]` parameter style; bare default-value style is legacy |

Use click (8.4.2) directly only when you need its decorator/plugin ecosystem without typer's layer.

## Data

| Library | Version | Use when | Gotcha |
|---|---|---|---|
| polars | 1.43.2 | Default for new DataFrame/ETL work — lazy engine, multicore | Not pandas-API-compatible; don't port idiom-for-idiom |
| pandas | 3.0.5 | Ecosystem interop demands it (sklearn, plotting, niche formats) | 3.0 defaults to copy-on-write + Arrow-backed strings; chained-assignment code breaks |
| duckdb | 1.5.5 | In-process SQL over Parquet/CSV/DataFrames | Single writer per database file |

## Web

| Library | Version | Use when | Gotcha |
|---|---|---|---|
| fastapi | 0.141.1 | Async APIs — see [fastapi-guide.md](fastapi-guide.md) | Still 0.x: minor bumps can break; uv.lock is your pin |
| sqlalchemy | 2.0.52 | Any relational DB access | Write 2.0-style (`select()`, `Session.execute`), not legacy `Query` |
| litestar | 2.24.0 | FastAPI alternative — msgspec-fast, class controllers, built-in DI | — |

## Tooling

| Library | Version | Use when | Gotcha |
|---|---|---|---|
| uv | 0.12.5 | All packaging/env work — see [dependencies.md](dependencies.md) | `uv pip` bypasses uv.lock |
| ruff | 0.16.3 | Lint and format, one tool | Lint config belongs under `[tool.ruff.lint]` |
| mypy | 2.3.1 | Type checking | Run as `uv run mypy .` so it sees the project env; `strict = true` is opt-in |
| pytest | 9.1.1 | All testing — see [testing.md](testing.md) | Config lives in `[tool.pytest.ini_options]` |

## Do not use

| Instead of | Use |
|---|---|
| requests by default | httpx — same ergonomics, plus async and HTTP/2 |
| black + isort | ruff format + ruff check (`I` rules) |
| poetry / pipenv for new projects | uv |
| Prisma Python client (dead) | sqlalchemy |
| python-jose | PyJWT |
| passlib (dead) | pwdlib |
