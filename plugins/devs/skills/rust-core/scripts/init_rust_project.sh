#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new Rust project per the rust-core greenfield spec: toolchain
# pinning, lints-as-config, rustfmt/clippy/deny templates, CLAUDE.md record.
# Self-verifying: the scaffolded project must pass check + fmt + clippy before
# this script reports success.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIGS="$SCRIPT_DIR/../assets/configs"

PROJECT_NAME="${1:-}"
PROJECT_TYPE="${2:-bin}"

if [[ -z "$PROJECT_NAME" ]]; then
    echo "Usage: $0 <project-name> [bin|lib]" >&2
    exit 1
fi
case "$PROJECT_TYPE" in
    bin|lib) ;;
    *) echo "Project type must be 'bin' or 'lib', got '$PROJECT_TYPE'" >&2; exit 1 ;;
esac

echo "Creating Rust project: $PROJECT_NAME (type: $PROJECT_TYPE)"
cargo new "--$PROJECT_TYPE" "$PROJECT_NAME"
cd "$PROJECT_NAME"

# MSRV = current stable at scaffold time. License defaults to the Rust
# ecosystem's dual license so cargo-deny passes out of the box — change it if
# the project wants something else.
RUST_VERSION="$(rustc --version | awk '{print $2}')"
awk -v rv="$RUST_VERSION" '{print} /^edition = /{
    print "rust-version = \"" rv "\""
    print "license = \"MIT OR Apache-2.0\" # scaffold default — set your actual license"
}' Cargo.toml > Cargo.toml.tmp && mv Cargo.toml.tmp Cargo.toml

cat > rust-toolchain.toml <<'TOML'
[toolchain]
channel = "stable"
TOML

# Lint levels: append only the [lints.*] tables from the template (skip its
# paste-me header). Appending is safe here — cargo new emits no [lints] table.
sed -n '/^\[lints.rust\]/,$p' "$CONFIGS/lints.toml" >> Cargo.toml

cp "$CONFIGS/clippy.toml" "$CONFIGS/rustfmt.toml" "$CONFIGS/deny.toml" .

# cargo new only writes .gitignore when it inits a fresh repo. Ensure /target
# is ignored either way. Cargo.lock is committed for both bins and libs.
if [[ ! -f .gitignore ]]; then
    echo "/target" > .gitignore
elif ! grep -qx '/target' .gitignore; then
    echo "/target" >> .gitignore
fi

cat > CLAUDE.md <<EOF
# $PROJECT_NAME

Scaffolded by rust-core init_rust_project.sh on $(date +%Y-%m-%d).

Conventions are machine-enforced, not implicit:
- Lint policy: \`[lints]\` in Cargo.toml; clippy.toml exempts tests from unwrap/expect denies.
- Formatting: rustfmt.toml (stable options only).
- Dependencies: deny.toml (license allowlist, RUSTSEC advisories). MSRV: $RUST_VERSION.

Verification gauntlet (CI must match):
\`cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test && cargo deny check\`
EOF

echo "Verifying scaffold..."
cargo check --quiet
cargo fmt --check
cargo clippy --all-targets --quiet -- -D warnings

echo "✅ $PROJECT_NAME scaffolded and verified (check + fmt + clippy clean)."
echo "Note: 'cargo deny check' additionally requires cargo-deny (cargo install cargo-deny)."
