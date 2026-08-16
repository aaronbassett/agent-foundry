#!/usr/bin/env bash
# smoke-rust-core.sh - Execute the rust-core skill's scripts and validate its
# config templates against the real toolchain. Every check here exists because
# an audit found the shipped version broken in exactly that way; keep the checks
# when editing the skill, they are what stops silent rot.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/colors.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL_DIR="$REPO_ROOT/plugins/devs/skills/rust-core"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

failed=0

print_section "rust-core skill smoke test"

# ── 1. Toolchain available ────────────────────────────────────────────────────
if ! command -v cargo >/dev/null 2>&1; then
    print_error "cargo not found — the smoke test requires a Rust toolchain"
    exit 1
fi
print_info "toolchain: $(rustc --version)"

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

# ── 3. init_rust_project.sh scaffolds projects that pass their own gauntlet ──
# (The script self-verifies with cargo check + fmt --check + clippy -D warnings,
# so a non-zero exit here means the scaffold or the config templates regressed.)
for ptype in bin lib; do
    if (cd "$WORK_DIR" && "$SKILL_DIR/scripts/init_rust_project.sh" "smoke-$ptype" "$ptype" >/dev/null 2>&1); then
        print_success "init_rust_project.sh $ptype: scaffold verified (check + fmt + clippy)"
    else
        print_error "init_rust_project.sh $ptype: scaffold failed its own verification"
        failed=1
    fi
done

# ── 4. deny.toml template is valid for current cargo-deny ────────────────────
if command -v cargo-deny >/dev/null 2>&1; then
    if (cd "$WORK_DIR/smoke-bin" && cargo deny check >/dev/null 2>&1); then
        print_success "deny.toml template: cargo deny check passes on scaffold"
    else
        print_error "deny.toml template: cargo deny check failed on scaffold"
        failed=1
    fi
else
    print_warning "cargo-deny not installed — template validation skipped (installed on CI)"
fi

# ── 5. setup_logging.sh compiles and refuses to clobber ──────────────────────
if (cd "$WORK_DIR/smoke-bin" \
        && "$SKILL_DIR/scripts/setup_logging.sh" >/dev/null 2>&1 \
        && printf 'mod logging;\nfn main() {\n    logging::init();\n}\n' > src/main.rs \
        && cargo clippy --all-targets --quiet -- -D warnings >/dev/null 2>&1); then
    print_success "setup_logging.sh: module compiles clippy-clean when wired up"
else
    print_error "setup_logging.sh: generated module fails compilation"
    failed=1
fi
if (cd "$WORK_DIR/smoke-bin" && "$SKILL_DIR/scripts/setup_logging.sh" >/dev/null 2>&1); then
    print_error "setup_logging.sh: overwrote an existing src/logging.rs (must refuse)"
    failed=1
else
    print_success "setup_logging.sh: refuses to overwrite existing module"
fi

# ── 6. audit_dependencies.sh runs without installing anything ────────────────
if (cd "$WORK_DIR/smoke-bin" && "$SKILL_DIR/scripts/audit_dependencies.sh" >/dev/null 2>&1); then
    print_success "audit_dependencies.sh: ran clean on scaffold"
else
    # Non-zero is legitimate when a real advisory fires; only flag hard errors.
    rc=$?
    if [[ $rc -eq 1 ]]; then
        print_warning "audit_dependencies.sh exited 1 (a check failed — inspect manually)"
    else
        print_error "audit_dependencies.sh: unexpected exit $rc"
        failed=1
    fi
fi

# ── 7. Rot-token scan: stale prescriptions that once shipped in this skill ───
# Unambiguous forms only (TOML dep pins, removed config keys, retired model IDs)
# so documenting an old form as a "don't" in prose stays legal.
ROT_PATTERNS=(
    'thiserror = "1'
    'criterion = "0\.5'
    'axum = "0\.[0-7]"'
    'reqwest = "0\.1[01]'
    'rand = "0\.[0-8]"'
    'edition = "2021"'
    'fn_args_layout ='
    'vulnerability = "'
    'unmaintained = "warn"'
    'copyleft = "'
    'use once_cell::sync::Lazy'
    'text-embedding-ada-002'
    'claude-3-'
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
    print_error "rust-core smoke test FAILED"
    exit 1
fi
print_success "rust-core smoke test passed"
