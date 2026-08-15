# Essential Rust Crates

Before pinning, confirm the current version with `cargo info <crate>` — never copy versions from docs or memory.

## Core crates

| Crate | Version | When to use | Key gotcha |
|-------|---------|-------------|------------|
| `anyhow` | 1.0 | Application error handling with context | Apps only — for the anyhow-vs-thiserror decision see [error-handling.md](error-handling.md) |
| `thiserror` | 2.0 | Derived error enums for libraries | A `#[from]` variant may hold only the source field |
| `serde` + `serde_json` | 1.0 | Serialization | `derive` is a feature flag, not a separate dependency |
| `tokio` | 1 | Async runtime | `features = ["full"]` is fine for binaries; libraries should enable only the features they use |
| `reqwest` | 0.13 | HTTP client (async-first) | Sync API needs the `blocking` feature |
| `chrono` | 0.4 | Calendar dates, timezones, formatting | For plain durations use `std::time`; `jiff` (0.2) is a modern alternative |
| `uuid` | 1 | UUIDs | Generation is behind version features (`v4`, `v7`) |
| `regex` | 1 | Regular expressions | Compile once (e.g. in a `LazyLock`), never per call |
| `indexmap` | 2 | Map/set preserving insertion order | Order is insertion order, not sorted |
| `itertools` | 0.15 | Iterator adaptors (`chunks`, `unique`, `cartesian_product`) | Still 0.x — minor bumps can break; check the changelog |
| `rand` | 0.10 | Random numbers | See the API notes below |
| `clap` | 4 | CLI parsing (with `derive` feature) | — |
| `tracing` | 0.1 | Structured logging | Emits nothing without a subscriber (`tracing-subscriber`) |
| `criterion` | 0.8 (dev) | Benchmarks | Prefer `std::hint::black_box` over criterion's re-export |
| `proptest` | 1 (dev) | Property-based testing | — |

## rand: the current API

Entry point is `rand::rng()`; convenience methods (`random()`, `random_range()`) live on the `RngExt` trait, `Rng` is the core trait, and `shuffle` requires `SliceRandom` in scope. Note `gen` is a reserved keyword in edition 2024, so `rng.gen()` is a syntax error — the method is `random()`:

```rust
use rand::seq::SliceRandom;
use rand::RngExt;

let mut rng = rand::rng();
let n: u32 = rng.random();
let d: u32 = rng.random_range(0..100);

let mut nums = vec![1, 2, 3, 4, 5];
nums.shuffle(&mut rng);
```

## Std covers these — don't add a crate

| Need | Use std | Min Rust |
|------|---------|----------|
| Lazy statics | `std::sync::LazyLock` | 1.80 |
| One-time initialization | `std::sync::OnceLock` | 1.70 |
| TTY detection | `std::io::IsTerminal` | 1.70 |
| Benchmark black box | `std::hint::black_box` | 1.66 |
| C-string literals | `c"..."` | 1.77 |
| CPU count | `std::thread::available_parallelism()` | 1.59 |

```rust
use std::sync::LazyLock;

static CONFIG: LazyLock<Config> =
    LazyLock::new(|| Config::load().expect("failed to load config"));
```

`once_cell` is legitimate only for its `unsync` types or an MSRV below 1.80 — do not introduce it by default. Same for `lazy_static`: use `LazyLock`.

## See also

- [error-handling.md](error-handling.md) — anyhow vs thiserror, error design patterns
- [dependencies.md](dependencies.md) — adding, updating, and auditing dependencies
