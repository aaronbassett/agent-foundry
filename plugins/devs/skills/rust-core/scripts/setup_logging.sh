#!/usr/bin/env bash
set -euo pipefail

# Add tracing-based logging to the current cargo project. Refuses to overwrite
# an existing src/logging.rs.

if [[ ! -f Cargo.toml ]]; then
    echo "No Cargo.toml in $(pwd) — run from a cargo project root." >&2
    exit 1
fi
if [[ -e src/logging.rs ]]; then
    echo "src/logging.rs already exists — refusing to overwrite it." >&2
    exit 1
fi

echo "Adding tracing dependencies..."
cargo add tracing
cargo add tracing-subscriber --features env-filter,json

mkdir -p src
cat > src/logging.rs <<'RUST'
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize tracing. `RUST_LOG` controls filtering (defaults to `info`);
/// set `LOG_FORMAT=json` for machine-readable output.
pub fn init() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let registry = tracing_subscriber::registry().with(filter);
    if std::env::var("LOG_FORMAT").is_ok_and(|v| v == "json") {
        registry.with(fmt::layer().json()).init();
    } else {
        registry.with(fmt::layer()).init();
    }
}
RUST

echo "✅ Logging module created at src/logging.rs."
echo ""
echo "Wire it up in main.rs:"
echo "  mod logging;"
echo "  fn main() {"
echo "      logging::init();"
echo "  }"
echo ""
echo "Usage: RUST_LOG=debug cargo run    |    LOG_FORMAT=json cargo run"
