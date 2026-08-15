# Testing

pytest 9.1 / pytest-asyncio 1.4 era. Config lives in `pyproject.toml`, not pytest.ini.

## Config

pytest-asyncio 1.x defaults to **strict** mode: without config, plain `async def` tests are collected but fail. Either set `asyncio_mode = "auto"` (below — no per-test markers needed) or keep strict and mark each test `@pytest.mark.asyncio`.

```toml
[tool.pytest.ini_options]
addopts = "-ra --strict-markers"
testpaths = ["tests"]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
```

## Core fixtures, raises, parametrize

```python
import pytest


def test_config_roundtrip(tmp_path, monkeypatch, capsys):
    cfg = tmp_path / "app.cfg"                    # unique per-test dir, auto-cleaned
    cfg.write_text("debug=true")
    monkeypatch.setenv("APP_CONFIG", str(cfg))    # reverted after the test
    print("loaded")
    assert capsys.readouterr().out == "loaded\n"


def test_rejects_bad_port():
    with pytest.raises(ValueError, match=r"invalid literal"):
        int("not-a-port")                          # match= guards the message too


@pytest.mark.parametrize(("raw", "expected"), [("1", 1), ("-3", -3), ("007", 7)])
def test_parse(raw, expected):
    assert int(raw) == expected


async def test_concurrent_parse():                 # no marker needed: auto mode
    import asyncio
    results = await asyncio.gather(*(asyncio.to_thread(int, s) for s in ("1", "2")))
    assert results == [1, 2]
```

Bare `pytest.raises` without `match=` passes on the *wrong* error — always constrain. Ignore "one assert per test" dogma: one **behavior** per test, as many asserts as that takes.

## Async FastAPI endpoints

`httpx.ASGITransport` calls the app in-process, but neither it nor a module-scope `TestClient(app)` runs lifespan — startup state is silently missing. Use `asgi-lifespan` (2.1.0) for async tests; for sync tests, `with TestClient(app) as client:` runs lifespan too. Deeper FastAPI patterns (dependency overrides, DB fixtures) live in [fastapi-guide.md](fastapi-guide.md) — don't duplicate them here.

```python
from contextlib import asynccontextmanager

import httpx
import pytest
from asgi_lifespan import LifespanManager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ready = True      # startup work happens here
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"ready": app.state.ready}


@pytest.fixture
async def client():
    async with LifespanManager(app) as mgr:       # runs startup/shutdown
        transport = httpx.ASGITransport(app=mgr.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"ready": True}
```

## Coverage

```bash
uv run pytest --cov --cov-report=term-missing
```

Bare `--cov` measures everything imported under the rootdir — no hardcoded package name to rot when the project is renamed. Scope it via `[tool.coverage.run] source = [...]` if needed.

## Worth one line each

- **hypothesis** (6.165.9) — property-based testing; give it invariants, it finds the counterexamples.
- **freezegun** (1.5.5) / **time-machine** (3.4.0) — freeze or shift time; time-machine is the faster C implementation.
- **pytest-xdist** (3.8.0) — `pytest -n auto` for parallel runs; requires tests isolated enough to shuffle across workers.

## Gotchas

- `--strict-markers` turns typo'd markers into collection errors instead of silently-skipped tests.
- Fixture scope beats setup/teardown methods; reach for `scope="session"` only for genuinely immutable resources.
- Async fixtures follow `asyncio_default_fixture_loop_scope` — leaving it unset earns a deprecation warning on current pytest-asyncio.
