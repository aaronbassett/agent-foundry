#!/usr/bin/env bash
set -uo pipefail

# Audit Python dependencies: known vulnerabilities (pip-audit over the exported
# lockfile) and outdated packages (uv tree). Never installs into any
# environment — pip-audit runs ephemerally via uvx. Runs every available check
# even if an earlier one fails. Exit code: non-zero if a check that ran failed.

if [[ ! -f pyproject.toml ]]; then
    echo "No pyproject.toml in $(pwd) — run from the project root." >&2
    exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
    echo "uv is required for this audit (https://docs.astral.sh/uv/)." >&2
    echo "For non-uv projects, run pip-audit against your own lockfile/requirements." >&2
    exit 1
fi

failed=0

echo "── Known vulnerabilities (pip-audit over uv.lock export) ──"
if [[ -f uv.lock ]]; then
    reqs="$(mktemp)"
    trap 'rm -f "$reqs"' EXIT
    if uv export --format requirements-txt --no-emit-project -o "$reqs" 2>/dev/null \
        || uv export --format requirements-txt -o "$reqs"; then
        uvx pip-audit -r "$reqs" --disable-pip || failed=1
    else
        echo "⚠ uv export failed — cannot audit." >&2
        failed=1
    fi
else
    echo "ℹ No uv.lock — run 'uv lock' first (or 'uv sync')."
    failed=1
fi

echo ""
echo "── Outdated dependencies (informational) ──"
uv tree --outdated 2>/dev/null || echo "ℹ 'uv tree --outdated' unavailable in this uv version — try 'uv lock --upgrade --dry-run'."

echo ""
if [[ "$failed" -ne 0 ]]; then
    echo "❌ Audit finished with failures (see above)."
else
    echo "✅ Audit finished clean."
fi
exit "$failed"
