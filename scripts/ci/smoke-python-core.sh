#!/usr/bin/env bash
# smoke-python-core.sh - Execute the python-core skill's scripts and validate
# its config template against the real toolchain. Each check exists because an
# audit found the shipped version broken in exactly that way.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/colors.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL_DIR="$REPO_ROOT/plugins/devs/skills/python-core"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

failed=0

print_section "python-core skill smoke test"

# ── 1. Toolchain ─────────────────────────────────────────────────────────────
if ! command -v uv >/dev/null 2>&1; then
    print_error "uv not found — the smoke test requires uv (https://docs.astral.sh/uv/)"
    exit 1
fi
print_info "toolchain: $(uv --version)"

# ── 2. shellcheck the skill's scripts ────────────────────────────────────────
if command -v shellcheck >/dev/null 2>&1; then
    if shellcheck "$SKILL_DIR"/scripts/*.sh; then
        print_success "shellcheck clean"
    else
        print_error "shellcheck findings in skill scripts"
        failed=1
    fi
else
    print_warning "shellcheck not installed — skipped (installed on CI runners)"
fi

# ── 3. init script scaffolds projects that pass their own gauntlet ───────────
# (Self-verifies with ruff format --check + ruff check + mypy + pytest. The old
# script emitted a literal "$PROJECT_NAME" as the package name — unbuildable.)
for ptype in package fastapi; do
    if (cd "$WORK_DIR" && "$SKILL_DIR/scripts/init_python_project.sh" "smoke-$ptype" "$ptype" >/dev/null 2>&1); then
        print_success "init_python_project.sh $ptype: scaffold verified (ruff + mypy + pytest)"
    else
        print_error "init_python_project.sh $ptype: scaffold failed its own verification"
        failed=1
    fi
done

# ── 4. Template must not trip current ruff deprecations ─────────────────────
# (The old ruff config used the removed top-level `select`.)
if [[ -d "$WORK_DIR/smoke-package" ]]; then
    ruff_out="$(cd "$WORK_DIR/smoke-package" && uv run ruff check . 2>&1 || true)"
    if grep -qi 'deprecat' <<<"$ruff_out"; then
        print_error "ruff reports deprecated settings in the scaffolded config:"
        echo "$ruff_out"
        failed=1
    else
        print_success "ruff config template: no deprecation warnings from current ruff"
    fi
fi

# ── 5. setup_logging.sh works in both modes and refuses to clobber ──────────
if (cd "$WORK_DIR/smoke-fastapi" \
        && "$SKILL_DIR/scripts/setup_logging.sh" >/dev/null 2>&1 \
        && uv run python -c "from logging_config import configure_logging; import structlog; configure_logging(); structlog.get_logger().info('smoke')" >/dev/null 2>&1 \
        && LOG_FORMAT=json uv run python -c "from logging_config import configure_logging; import structlog; configure_logging(); structlog.get_logger().info('smoke')" >/dev/null 2>&1 \
        && uv run mypy logging_config.py >/dev/null 2>&1); then
    print_success "setup_logging.sh: module runs (console + json) and passes mypy"
else
    print_error "setup_logging.sh: generated module failed to run or type-check"
    failed=1
fi
if (cd "$WORK_DIR/smoke-fastapi" && "$SKILL_DIR/scripts/setup_logging.sh" >/dev/null 2>&1); then
    print_error "setup_logging.sh: overwrote an existing logging_config.py (must refuse)"
    failed=1
else
    print_success "setup_logging.sh: refuses to overwrite existing module"
fi

# ── 6. audit_dependencies.sh runs without installing into any environment ────
if (cd "$WORK_DIR/smoke-fastapi" && "$SKILL_DIR/scripts/audit_dependencies.sh" >/dev/null 2>&1); then
    print_success "audit_dependencies.sh: ran clean on scaffold"
else
    rc=$?
    if [[ $rc -eq 1 ]]; then
        print_warning "audit_dependencies.sh exited 1 (a check failed — inspect manually)"
    else
        print_error "audit_dependencies.sh: unexpected exit $rc"
        failed=1
    fi
fi

# ── 7. Rot-token scan: stale prescriptions that once shipped in this skill ───
# Unambiguous prescriptive forms only, so negative guidance stays legal.
ROT_PATTERNS=(
    'from typing import List'
    'from sqlalchemy\.ext\.declarative import'
    'from jose import'
    'CryptContext'
    'fastapi>=0\.104'
    'pytest>=7'
    'ruff>=0\.1\.0'
    'python_version = "?3\.1[01]'
)
rot_found=0
for pattern in "${ROT_PATTERNS[@]}"; do
    if hits="$(grep -rEn "$pattern" "$SKILL_DIR" 2>/dev/null)"; then
        print_error "stale prescription '$pattern':"
        echo "$hits"
        rot_found=1
    fi
done
if [[ $rot_found -eq 0 ]]; then
    print_success "rot-token scan clean"
else
    failed=1
fi

# ── Result ───────────────────────────────────────────────────────────────────
echo ""
if [[ $failed -ne 0 ]]; then
    print_error "python-core smoke test FAILED"
    exit 1
fi
print_success "python-core smoke test passed"
