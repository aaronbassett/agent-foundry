# Performance Optimization in Rust

Profile before optimizing; always measure release builds.

## Tooling

- **samply** — sampling profiler with the Firefox Profiler UI: `samply record ./target/release/app`. Lowest-friction option on macOS/Linux.
- **cargo-flamegraph** — `cargo flamegraph --bin app`. Set `[profile.release] debug = true` while profiling so frames resolve.
- **criterion** — statistical benchmarks; setup and examples live in [testing.md](testing.md) (canonical, not repeated here). **divan** is a lighter alternative with near-zero boilerplate.
- **cargo-bloat** — what's contributing to binary size.
- **cargo-show-asm** — inspect generated assembly: `cargo install cargo-show-asm`, then `cargo asm my_crate::my_fn` (the subcommand is `cargo asm`, but the crate to install is `cargo-show-asm`).
- **PGO** — profile-guided optimization exists (`cargo-pgo` wraps the workflow); worth trying on hot server binaries after the cheaper wins.

## Allocation

Take `&[T]`/`&str` parameters instead of owned values; use `Cow` when you only sometimes need to allocate:

```rust
use std::borrow::Cow;

fn sanitize(input: &str) -> Cow<'_, str> {
    if input.contains("bad") {
        Cow::Owned(input.replace("bad", "good"))
    } else {
        Cow::Borrowed(input)
    }
}
```

Pre-allocate collections (`Vec::with_capacity`, `String::with_capacity`). For small, usually-tiny vectors, `smallvec` keeps elements on the stack.

String building:

```rust
use std::fmt::Write;

fn build() -> String {
    // Bad: `s = s + &x` re-allocates and copies every iteration
    // Also bad: (0..1000).map(|i| i.to_string()).collect::<String>()
    //   — one intermediate String allocation per element

    // Good: pre-allocate once, write! formats directly into the buffer
    let mut s = String::with_capacity(4000);
    for i in 0..1000 {
        write!(s, "{i}").unwrap();
    }
    s
}
```

## Iterators and bounds checks

Iterate rather than index — `for item in &vec` lets LLVM elide bounds checks that `vec[i]` in a manual `0..vec.len()` loop may not. Chain lazily; don't `collect()` intermediates between `map` and `filter`.

## Data structures

- `HashMap` O(1) unordered; `BTreeMap` O(log n) ordered iteration/range queries; sorted `Vec` + `binary_search` often beats both for read-heavy small data.
- `rustc_hash::FxHashMap` is a drop-in `HashMap` replacement with a much faster hash — **but FxHash is not HashDoS-resistant. Only use it when keys are trusted (internal IDs, interned symbols). Keep the default SipHash for anything attacker-controlled.**

## Parallelism

```rust
use rayon::prelude::*;

fn sum(data: &[i64]) -> i64 {
    data.par_iter().map(|x| x * 2).sum() // par_iter: drop-in for CPU-bound work
}
```

## Build configuration

```toml
[profile.release]
opt-level = 3
lto = "fat"             # whole-program LTO; "thin" compiles much faster, nearly as good
codegen-units = 1       # better codegen, slower compile
strip = true
```

`RUSTFLAGS="-C target-cpu=native" cargo build --release` for machine-local binaries (not portable artifacts).
