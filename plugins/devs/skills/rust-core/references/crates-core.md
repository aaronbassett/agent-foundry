# Essential Rust Crates

Versions verified against crates.io, August 2026 (Rust 1.97, edition 2024). Before pinning, confirm with `cargo info <crate>` — never copy versions from old docs or memory.

## Core crates

| Crate | Version | When to use | Key gotcha |
|-------|---------|-------------|------------|
| `anyhow` | 1.0 | Application error handling with context | Apps only — for the anyhow-vs-thiserror decision see [error-handling.md](error-handling.md) |
| `thiserror` | 2.0 | Derived error enums for libraries | 2.x since late 2024; most online examples still show 1.x. A `#[from]` variant may hold only the source field |
| `serde` + `serde_json` | 1.0 | Serialization | `derive` is a feature flag, not a separate dependency |
| `tokio` | 1 | Async runtime | `features = ["full"]` is fine for binaries; libraries should enable only the features they use |
| `reqwest` | 0.13 | HTTP client (async-first) | 0.11-era snippets are stale; sync API needs the `blocking` feature |
| `chrono` | 0.4 | Calendar dates, timezones, formatting | For plain durations use `std::time`; `jiff` (0.2) is a modern alternative |
| `uuid` | 1 | UUIDs | Generation is behind version features (`v4`, `v7`) |
| `regex` | 1 | Regular expressions | Compile once (e.g. in a `LazyLock`), never per call |
| `indexmap` | 2 | Map/set preserving insertion order | Order is insertion order, not sorted |
| `itertools` | 0.15 | Iterator adaptors (`chunks`, `unique`, `cartesian_product`) | Still 0.x — minor bumps can break; check the changelog |
| `rand` | 0.10 | Random numbers | API renamed in 0.9 — see below |
| `clap` | 4 | CLI parsing (with `derive` feature) | — |
| `tracing` | 0.1 | Structured logging | Emits nothing without a subscriber (`tracing-subscriber`) |
| `criterion` | 0.8 (dev) | Benchmarks | Prefer `std::hint::black_box` over criterion's re-export |
| `proptest` | 1 (dev) | Property-based testing | — |

## rand 0.9+: the renamed API

Pre-0.9 examples all over the internet no longer compile: `thread_rng()` became `rand::rng()`, `gen()` became `random()`, `gen_range` became `random_range`. Worse, `gen` is a reserved keyword in edition 2024, so `rng.gen()` is a **syntax error**, not merely deprecated. As of 0.10, the convenience methods live on the `RngExt` trait (`Rng` is now the core trait, formerly `RngCore`), and `shuffle` still requires `SliceRandom` in scope:

```rust
use rand::seq::SliceRandom;
use rand::RngExt;

let mut rng = rand::rng();
let n: u32 = rng.random();
let d: u32 = rng.random_range(0..100);

let mut nums = vec![1, 2, 3, 4, 5];
nums.shuffle(&mut rng);
```

## Std replaces crates

Reach for std first — these former staples are unnecessary in new code:

| Was | Now in std | Since |
|-----|-----------|-------|
| `once_cell::sync::Lazy`, `lazy_static!` | `std::sync::LazyLock` | 1.80 |
| `once_cell::sync::OnceCell` | `std::sync::OnceLock` | 1.70 |
| `atty` | `std::io::IsTerminal` | 1.70 |
| `criterion::black_box` | `std::hint::black_box` | 1.66 |
| `cstr` crate | C-string literals `c"..."` | 1.77 |
| `num_cpus` (basic use) | `std::thread::available_parallelism()` | 1.59 |

```rust
use std::sync::LazyLock;

static CONFIG: LazyLock<Config> =
    LazyLock::new(|| Config::load().expect("failed to load config"));
```

`once_cell` is still legitimate for its `unsync` types or when supporting MSRV below 1.80, but do not introduce it by default.

## See also

- [error-handling.md](error-handling.md) — anyhow vs thiserror, error design patterns
- [dependencies.md](dependencies.md) — adding, updating, and auditing dependencies
