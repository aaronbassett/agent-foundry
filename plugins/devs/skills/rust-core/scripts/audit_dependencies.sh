#!/usr/bin/env bash
set -uo pipefail

# Audit dependencies: security advisories (cargo-audit), policy (cargo-deny),
# freshness (cargo-outdated). Never installs anything — missing tools are
# reported with install hints and skipped. Runs every available check even if
# an earlier one fails. Exit code: non-zero if any check that ran failed.

if [[ ! -f Cargo.toml ]]; then
    echo "No Cargo.toml in $(pwd) — run from a cargo project root." >&2
    exit 1
fi

failed=0
skipped=0

echo "── Security advisories (cargo audit) ──"
if command -v cargo-audit >/dev/null 2>&1; then
    cargo audit || failed=1
else
    echo "⚠ cargo-audit not installed — skipped. Install: cargo install cargo-audit"
    skipped=1
fi

echo ""
echo "── Dependency policy (cargo deny) ──"
if [[ -f deny.toml ]]; then
    if command -v cargo-deny >/dev/null 2>&1; then
        cargo deny check || failed=1
    else
        echo "⚠ deny.toml present but cargo-deny not installed — skipped. Install: cargo install cargo-deny"
        skipped=1
    fi
else
    echo "ℹ No deny.toml — copy the rust-core template or run 'cargo deny init'."
fi

echo ""
echo "── Outdated dependencies (cargo outdated, informational) ──"
if command -v cargo-outdated >/dev/null 2>&1; then
    cargo outdated || true
else
    echo "ℹ cargo-outdated not installed — skipped. Install: cargo install cargo-outdated"
fi

echo ""
if [[ "$failed" -ne 0 ]]; then
    echo "❌ Audit finished with failures (see above)."
elif [[ "$skipped" -ne 0 ]]; then
    echo "⚠ Audit finished; some checks were skipped for missing tools."
else
    echo "✅ Audit finished clean."
fi
exit "$failed"
