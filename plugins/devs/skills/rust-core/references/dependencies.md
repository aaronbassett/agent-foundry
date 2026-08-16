# Dependency Management in Rust

Assumes Rust 1.97+, edition 2024 (resolver v3). This file is the canonical reference for workspace dependency management.

## Adding dependencies

Default to `cargo add` — it resolves the current version and edits `Cargo.toml` for you:

```bash
cargo add serde --features derive
cargo add tokio --features rt-multi-thread,macros
cargo add --dev proptest
cargo add --build cc
cargo remove some-crate
```

When editing by hand: `serde = "1.0"` is a caret requirement (`>=1.0.0, <2.0.0`) — the default and almost always right. `=1.2.3` pins exactly; `~1.2.3` allows patch bumps only. Avoid wildcards (`*`) — crates.io rejects them.

Alternative sources:

```toml
my-lib = { git = "https://github.com/user/my-lib", tag = "v0.1.0" }  # or branch/rev
my-lib = { path = "../my-lib" }
```

## Features

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
reqwest = { version = "0.13", default-features = false, features = ["json"] }
tokio = { version = "1", optional = true }

[features]
default = ["std"]
std = []
async = ["dep:tokio"]
```

Use `dep:` for optional dependencies. Features are additive and unified across the whole build graph, so enable only what you need.

## Workspace dependencies

Declare versions once at the root; members reference them:

```toml
# Root Cargo.toml
[workspace]
members = ["crate-a", "crate-b"]
resolver = "3"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
tokio = "1"

# Member Cargo.toml
[dependencies]
serde.workspace = true
tokio = { workspace = true, features = ["macros"] }  # members can add features, never remove them
```

**Feature unification**: Cargo compiles each crate version once with the union of every feature requested anywhere in the graph. One member enabling `tokio/full` enables it for all members. Keep `[workspace.dependencies]` entries minimal-featured and let members opt in.

## Updating

```bash
cargo update              # latest versions compatible with Cargo.toml ranges
cargo update -p serde     # one package
cargo update --recursive  # also force-update its dependencies
cargo outdated            # cargo install cargo-outdated
```

**Deduplicating versions**: if `cargo tree --duplicates` shows two semver-compatible copies of a crate, run `cargo update -p <crate>` or bump the stricter requirement. Do **not** reach for `[patch.crates-io]` with a bare version — Cargo rejects it:

> error: patch for `serde` points to the same source, but patches must point to different sources

`[patch]` exists only to substitute a *different source* (git or path), e.g. to test an unreleased fix:

```toml
[patch.crates-io]
serde = { git = "https://github.com/serde-rs/serde" }
```

## Cargo.lock and MSRV

- **Commit `Cargo.lock` for everything** — applications and libraries alike. Current Cargo guidance dropped the old "gitignore it for libraries" rule.
- Declare `rust-version` in `Cargo.toml`. Resolver v3 (default with edition 2024) is MSRV-aware: `cargo update` selects the newest versions compatible with your `rust-version`, reporting e.g. `Locking 1 package to latest Rust 1.63 compatible version`.

## Auditing

```bash
cargo audit             # RustSec advisories (cargo install cargo-audit)
cargo deny check        # advisories + licenses + bans + duplicate versions
cargo machete           # unused dependencies (fast, syntactic)
cargo +nightly udeps    # unused dependencies via full build (thorough)
cargo semver-checks     # libraries: catch accidental API breaks before publishing
cargo tree -i <crate>   # why is this in my graph?
```

For cargo-deny configuration, start from this skill's asset: [../assets/configs/deny.toml](../assets/configs/deny.toml). Do not write the schema from memory — its keys change between releases.

## Practices

1. Caret versions; pin (`=`) only with a written reason
2. Minimal features everywhere; make heavy dependencies optional
3. Run `cargo audit` and `cargo deny check` in CI
4. Check `cargo tree --duplicates` when builds get slow
5. `cargo vendor` for offline or supply-chain-controlled builds

Project layout and workspace structure: see project-structure.md, which links back here for dependency policy.
