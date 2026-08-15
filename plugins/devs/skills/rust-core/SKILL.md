---
name: devs:rust-core
description: "Use when writing, debugging, reviewing, or architecting Rust code — compiler or borrow-checker errors, async/tokio work, error handling (thiserror/anyhow), testing and benchmarking, performance tuning, web services (axum/actix-web), CLI/TUI tools (clap/ratatui), Tauri desktop apps, AI/LLM API integration, Cargo workspace and dependency management, or scaffolding a new Rust project. Contains version-verified references, a breaking-change landmarks table, scaffolding scripts, and lint/rustfmt/deny config templates."
---

# Rust Core Development

Reference hub for Rust work. Everything version-sensitive in here was verified against crates.io and the stable toolchain in August 2026 — when in doubt, re-verify with `cargo info <crate>`; never trust trained knowledge for versions or ecosystem APIs.

## Reference routing

Load references on demand — not all at once.

| Reference | Use when |
|---|---|
| [error-handling.md](references/error-handling.md) | Choosing thiserror vs anyhow, designing error types |
| [async-patterns.md](references/async-patterns.md) | tokio, streams, channels, async traits, actor pattern, retry/backoff |
| [patterns.md](references/patterns.md) | Builder, newtype, typestate, RAII; pattern-selection table |
| [common-errors.md](references/common-errors.md) | Confusing compiler errors beyond rustc's own suggestions |
| [testing.md](references/testing.md) | Test organization, criterion, nextest/rstest/insta/proptest |
| [performance.md](references/performance.md) | Profiling, allocation, release-profile tuning |
| [project-structure.md](references/project-structure.md) | Modules, workspaces, prelude/re-export patterns |
| [dependencies.md](references/dependencies.md) | cargo add, workspace deps, MSRV resolver, patching, unused deps |
| [crates-core.md](references/crates-core.md) | Version-verified essential-crates table; std-replaces-crate list |
| [web-frameworks.md](references/web-frameworks.md) | axum (default), actix-web; framework selection |
| [cli-tui.md](references/cli-tui.md) | clap, ratatui, CLI testing with assert_cmd |
| [desktop-tauri.md](references/desktop-tauri.md) | Tauri v2 (capabilities model, v1→v2 migration landmarks) |
| [ai-llm.md](references/ai-llm.md) | Calling LLM APIs from Rust (Anthropic/OpenAI-compatible/ollama) |
| [logging-observability.md](references/logging-observability.md) | tracing, OpenTelemetry, Prometheus metrics |

For code-review checklists use the `devs:code-review` skill; for dependency auditing workflows use `devs:deps-core`.

## Breaking-change landmarks (as of Aug 2026)

Models trained earlier routinely emit the old forms. Do not.

| Crate/area | Landmark |
|---|---|
| edition | 2024 is current (`gen` is a keyword — `rng.gen()` is a syntax error) |
| axum 0.8 | Route params are `/users/{id}`; `/:id` panics at router build. No `#[async_trait]` on extractors |
| rand 0.9/0.10 | `thread_rng()`→`rng()`, `gen*`→`random*`; 0.10 moved `random*` to `RngExt` |
| thiserror | 2.x current |
| Tauri | v2: capabilities/permissions (no allowlist), `tauri::api` removed, `@tauri-apps/api/core` |
| once_cell / lazy_static | Use `std::sync::LazyLock` / `OnceLock` (stable since 1.80/1.70) |
| criterion | Use `std::hint::black_box`, not `criterion::black_box` |
| cargo | `cargo update --recursive` (not `--aggressive`); commit `Cargo.lock` everywhere; resolver "3" is MSRV-aware |
| cargo-deny | v2 schema: no `vulnerability`/`unmaintained`/`copyleft` keys |
| rustfmt | `imports_granularity`/`group_imports` are still nightly-only; `fn_args_layout` → `fn_params_layout` |

## Decision guides

**Web framework:** axum is the default (tower ecosystem, ecosystem-standard in 2026). actix-web for maximum-throughput services or existing actix codebases. Everything else needs a justification. Details: [web-frameworks.md](references/web-frameworks.md).

**Errors:** thiserror for libraries (callers match on variants), anyhow for binaries (context chains). Details: [error-handling.md](references/error-handling.md).

**Async:** only for I/O-bound concurrency; CPU-bound work uses threads/`spawn_blocking`; simple CLIs stay sync. Details: [async-patterns.md](references/async-patterns.md).

## Default crates

When the project doesn't dictate otherwise (versions + gotchas in [crates-core.md](references/crates-core.md)): tokio (async), serde/serde_json (serialization), thiserror/anyhow (errors), tracing + tracing-subscriber (logging), reqwest (HTTP client), axum (HTTP server), clap derive (CLI), sqlx (SQL), jiff (time; chrono only for interop), proptest (property tests), insta (snapshots), criterion (benches). Prefer std where it now covers the need — see the std-replaces-crate list in crates-core.md.

## Naming conventions

| Item | Convention | | Item | Convention |
|---|---|---|---|---|
| Types/traits | `CamelCase` | | Crates/features | `kebab-case` |
| Functions/variables/modules | `snake_case` | | Constants/statics | `SCREAMING_SNAKE_CASE` |

No `get_` prefix on getters (`fn name()`, not `fn get_name()`); no `*able` capability-trait suffixes (std uses `Copy`, `Send`, not `Copyable`).

## Scripts

- `${CLAUDE_SKILL_DIR}/scripts/init_rust_project.sh <name> [bin|lib]` — scaffold a project per the greenfield spec (toolchain pinning, `[lints]` table, config templates, CLAUDE.md); self-verifies with check + fmt + clippy before reporting success.
- `${CLAUDE_SKILL_DIR}/scripts/audit_dependencies.sh` — cargo-audit + cargo-deny + cargo-outdated; never installs tools, reports what it skipped, non-zero exit on failures.
- `${CLAUDE_SKILL_DIR}/scripts/setup_logging.sh` — add tracing + a `src/logging.rs` init module; refuses to overwrite an existing one.

## Config templates (`${CLAUDE_SKILL_DIR}/assets/configs/`)

- `lints.toml` — `[lints]` tables for Cargo.toml: `unsafe_code = "forbid"`, unwrap/expect denied, curated pedantic picks. **Pairs with** `clippy.toml`, which exempts tests from the unwrap/expect denies — copy both or neither.
- `rustfmt.toml` — stable-channel options only.
- `deny.toml` — current cargo-deny schema: RUSTSEC advisories, hand-curated license allowlist, source restrictions; private unpublished crates exempt from license checks.
