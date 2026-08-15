#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new Python project per the python-core greenfield spec, delegating
# layout to `uv init` so the structure always matches current uv conventions.
# Self-verifying: the scaffold must pass ruff (lint + format), mypy, and pytest
# before this script reports success.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIGS="$SCRIPT_DIR/../assets/configs"

PROJECT_NAME="${1:-}"
PROJECT_TYPE="${2:-package}"  # package | fastapi

if [[ -z "$PROJECT_NAME" ]]; then
    echo "Usage: $0 <project-name> [package|fastapi]" >&2
    exit 1
fi
case "$PROJECT_TYPE" in
    package|fastapi) ;;
    *) echo "Project type must be 'package' or 'fastapi', got '$PROJECT_TYPE'" >&2; exit 1 ;;
esac
if ! command -v uv >/dev/null 2>&1; then
    echo "uv is required (https://docs.astral.sh/uv/ — brew install uv)" >&2
    exit 1
fi

echo "Creating Python project: $PROJECT_NAME (type: $PROJECT_TYPE)"
if [[ "$PROJECT_TYPE" == "fastapi" ]]; then
    # --package: src layout with the project installed into the venv, so tests
    # import the app package instead of relying on sys.path tricks.
    uv init --package "$PROJECT_NAME"
else
    uv init --lib "$PROJECT_NAME"
fi
cd "$PROJECT_NAME"
PKG_NAME="$(echo "$PROJECT_NAME" | tr '-' '_')"

# Lint/type/test policy: append the [tool.*] tables (uv init emits none).
cat "$CONFIGS/pyproject-tools.toml" >> pyproject.toml

# Dev tools live in the PEP 735 dev dependency group.
uv add --dev pytest mypy ruff

mkdir -p tests
if [[ "$PROJECT_TYPE" == "fastapi" ]]; then
    uv add fastapi uvicorn
    uv add --dev httpx  # required by starlette's TestClient
    cat > "src/$PKG_NAME/main.py" <<'PY'
from fastapi import FastAPI

app = FastAPI(title="API")


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok"}
PY
    cat > tests/test_smoke.py <<PY
from fastapi.testclient import TestClient

from ${PKG_NAME}.main import app


def test_root() -> None:
    with TestClient(app) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
PY
    echo "Run the API with: uv run uvicorn ${PKG_NAME}.main:app --reload"
else
    cat > tests/test_smoke.py <<PY
import ${PKG_NAME}


def test_import() -> None:
    assert ${PKG_NAME} is not None
PY
fi

# Make sure standard artefacts are ignored regardless of how uv init behaved.
touch .gitignore
for pattern in ".venv" "__pycache__/" ".pytest_cache/" ".mypy_cache/" ".ruff_cache/"; do
    grep -qxF "$pattern" .gitignore || echo "$pattern" >> .gitignore
done

cat > CLAUDE.md <<EOF
# $PROJECT_NAME

Scaffolded by python-core init_python_project.sh on $(date +%Y-%m-%d).

Conventions are machine-enforced, not implicit:
- uv manages the environment; dev tools are in the PEP 735 \`dev\` dependency group; \`uv.lock\` is committed.
- Lint/format: ruff (\`[tool.ruff.lint]\` in pyproject.toml). Types: mypy strict. Tests: pytest in \`tests/\`.

Verification gauntlet (CI must match):
\`uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest\`
EOF

echo "Verifying scaffold..."
uv run ruff format --quiet .
uv run ruff format --check --quiet .
uv run ruff check --quiet .
uv run mypy . > /dev/null
uv run pytest -q

echo "✅ $PROJECT_NAME scaffolded and verified (ruff + mypy + pytest clean)."
