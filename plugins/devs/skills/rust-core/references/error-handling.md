# Error Handling

Canonical home for the thiserror-vs-anyhow decision. `Result`/`Option`/`?` basics assumed.

## Strategy Decision Table

| Scenario | Use |
|----------|-----|
| Library public API | `Result<T, CustomError>` via `thiserror` — callers can `match` |
| Application / binary | `anyhow::Result<T>` + `.context()` |
| Value legitimately absent | `Option<T>` — absence is not an error |
| Programming bug, broken invariant | `panic!` / `assert!` / `debug_assert!` |
| Prototype, example, test | `Box<dyn Error>` or `.unwrap()` |
| Hot path | small custom enum — `thiserror` derives cost nothing at runtime |
| `no_std` | `core::error::Error` + `thiserror` with `default-features = false` |
| Error crosses threads / tasks | ensure the type is `Send + Sync + 'static` |
| Transient failure (network, I/O) | retry with backoff — [async-patterns.md](async-patterns.md) |
| Many fallible items, fail fast | `.collect::<Result<Vec<_>, _>>()` |
| Many fallible items, keep going | collect `Vec<Result<...>>`, then `.partition(Result::is_ok)` |
| Need caller-visible extensibility | mark the enum `#[non_exhaustive]` |

## thiserror (2.x)

Current major is 2 (verified 2.0.20). Derives `Display`, `Error`, and `From` with zero runtime cost:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DataError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("parse error: {0}")]
    Parse(#[from] std::num::ParseIntError),

    #[error("invalid configuration: {key} = {value}")]
    InvalidConfig { key: String, value: String },

    #[error(transparent)]
    Other(#[from] Box<dyn std::error::Error + Send + Sync>),
}
```

`#[from]` generates both the `From` impl (enabling `?` conversion) and `source()` chaining. Mark public error enums `#[non_exhaustive]` so adding a variant isn't semver-breaking.

**1 → 2 migration** (usually compiles unchanged):

- Format strings use `{type}`, no longer `{r#type}`, for raw-identifier fields.
- `{0}`-style field access can't be mixed with extra positional format args — name them instead.
- Any crate invoking `derive(Error)` needs a direct `thiserror` dependency.
- New: `no_std` via `default-features = false`; `#[error(fmt = path)]` for out-of-line formatting.

`core::error::Error` has been stable since Rust 1.81, so custom error types (and thiserror 2) work under `#![no_std]`.

## anyhow (1.x)

For applications: one opaque `anyhow::Error`, wraps anything implementing `std::error::Error + Send + Sync`:

```rust
use anyhow::{Context, Result, bail, ensure};

fn process_file(path: &str) -> Result<Data> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read {path}"))?;

    ensure!(!contents.is_empty(), "file is empty: {path}");

    let data: Data = serde_json::from_str(&contents).context("invalid JSON")?;
    if data.version != EXPECTED_VERSION {
        bail!("unsupported version: {}", data.version);
    }
    Ok(data)
}
```

- `.context(msg)` / `.with_context(|| ...)` (lazy — prefer it when the message allocates).
- `bail!` = early return; `ensure!` = `assert!` that returns `Err` instead of panicking.
- `format!("{:#}", err)` prints the whole context chain on one line; `{:?}` multi-line with backtrace (when `RUST_BACKTRACE=1`).

## Mixing Both

Libraries return typed errors; applications `?` them into `anyhow::Error` automatically:

```rust
fn app() -> anyhow::Result<()> {
    let data = my_lib::load()?; // MyLibError -> anyhow::Error via From
    if let Err(e) = my_lib::save(&data) {
        if let Some(io) = e.source().and_then(|s| s.downcast_ref::<std::io::Error>()) {
            eprintln!("I/O layer: {io}");
        }
        return Err(e.into());
    }
    Ok(())
}
```

Recover a concrete type from `anyhow::Error` with `err.downcast_ref::<MyLibError>()`.

## Idioms

```rust
// Option -> Result
let user = find_user(id).ok_or(ApiError::NotFound)?;

// Fail-fast collect
let nums: Result<Vec<i32>, _> = ["1", "2", "x"].iter().map(|s| s.parse()).collect();

// Fallback chain
let config = from_env()
    .or_else(|_| from_file("config.toml"))
    .unwrap_or_default();
```

Testing error paths: assert on the variant, not the message — `assert!(matches!(err, DataError::Parse(_)))`. Display strings are not API.

Retry loops for transient errors live in [async-patterns.md](async-patterns.md).
