# Rust Project Structure

## Layout

One tree covers the conventions — every directory is optional until needed:

```
my-crate/
├── Cargo.toml
├── build.rs           # optional build script
├── src/
│   ├── main.rs        # binary root (lib.rs for libraries; both is fine)
│   ├── lib.rs
│   ├── error.rs
│   ├── database.rs    # module root: declares submodules, re-exports
│   └── database/      # submodules of `database`
│       ├── connection.rs
│       └── query.rs
├── tests/             # integration tests (each file = separate crate)
├── benches/
└── examples/
```

Modern module style (no `mod.rs`): the module root is `database.rs`, and its submodules live in the sibling `database/` directory. `database.rs` replaces what `database/mod.rs` did in 2015-edition layouts — use one or the other for a given module, never both.

```rust
// src/database.rs
mod connection;
mod query;

pub use connection::Connection;
pub use query::Query;
```

Keep hierarchies shallow (~3 levels). Organize by feature (`users/`, `billing/`), not by layer (`models/`, `controllers/`). Extract shared types into a `types.rs`/`core` module to break circular `use crate::a ↔ use crate::b` dependencies.

## Public API design

Flatten with re-exports so consumers don't learn your internal layout:

```rust
// src/lib.rs
mod database;
mod api;
mod utils; // private — not reachable from outside

pub use database::{Connection, Query};
pub use api::{Router, Request, Response};
```

Prelude pattern for crates with many commonly-needed items:

```rust
// src/prelude.rs
pub use crate::database::{Connection, Query};
pub use crate::error::{Error, Result};

// consumers: use my_lib::prelude::*;
```

Document the crate root with `//!` and enable `#![warn(missing_docs)]` + `#![warn(rustdoc::broken_intra_doc_links)]` in libraries.

## Feature-gated modules

`async` is a reserved keyword — `pub mod async;` does not compile. Use a raw identifier or (better) a non-keyword name:

```rust
// src/lib.rs
pub mod sync;

#[cfg(feature = "async")]
pub mod r#async; // file: src/async.rs — or just name the module `asynchronous`
```

```toml
[features]
default = ["sync"]
sync = []
async = ["dep:tokio"]
```

Platform-specific code follows the same shape with `#[cfg(unix)]` / `#[cfg(windows)]` on `mod` declarations plus a `pub use unix::*;`-style re-export so callers see one API.

## Workspaces

```
my-workspace/
├── Cargo.toml      # [workspace] members = ["crates/*"]
├── Cargo.lock      # single shared lockfile
└── crates/{core,api,cli}/
```

Shared `[workspace.dependencies]`, `[workspace.package]` inheritance (`version.workspace = true`), and dependency-management practice are covered in [dependencies.md](dependencies.md) — canonical there, not duplicated here.

## Cargo.toml

```toml
[package]
name = "my-crate"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"   # MSRV; 1.85 is the minimum for edition 2024
description = "A short description"
license = "MIT OR Apache-2.0"
repository = "https://github.com/username/my-crate"
keywords = ["parsing", "data"]
categories = ["parsing"]

[dependencies]
serde = { version = "1", features = ["derive"], optional = true }

[features]
default = []
serde-support = ["dep:serde"]

[profile.release]
lto = "fat"
codegen-units = 1
strip = true
```

Non-obvious bits: `rust-version` makes MSRV violations a resolver error instead of a cryptic build failure; `dep:serde` in features avoids exposing an implicit `serde` feature; `include`/`exclude` control what `cargo publish` ships.

## Build scripts

```rust
// build.rs
fn main() {
    println!("cargo:rerun-if-changed=build.rs"); // without this, reruns on every change
    println!("cargo:rustc-env=BUILD_TIME=2026-01-01");
    println!("cargo:rustc-link-lib=mylib");
}
```

## Anti-patterns

- Deep nesting: `src/api/v1/handlers/users/profile/settings/privacy.rs` — flatten.
- 3000-line `main.rs` — split by feature.
- Mixing `mod.rs` and non-`mod.rs` styles in one crate — pick one.
- Circular module dependencies — extract shared types.
