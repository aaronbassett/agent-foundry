# Testing

## Organization

- Unit tests: `#[cfg(test)] mod tests` in the same file — can test private items.
- Integration tests: `tests/*.rs`, each file a separate crate exercising the public API. Share helpers via `tests/common/mod.rs` — a top-level `tests/common.rs` would itself be compiled as a test crate.
- Doc tests: ` ``` ` examples in `///` comments, run by `cargo test --doc`.
- Return `Result` from tests to use `?`: `fn t() -> Result<(), Box<dyn Error>>`.

## Modern Tooling

| Tool | Why |
|------|-----|
| `cargo-nextest` (0.9) | faster runner, per-test process isolation, retries for flaky tests |
| `rstest` (0.26) | fixtures + `#[case]` parameterized tests, each case its own test |
| `insta` (1.48) | snapshot testing; review diffs with `cargo insta review` |
| `proptest` (1.11) | property-based testing; shrinks failures to minimal input |
| `#[tokio::test(start_paused = true)]` | virtual clock for time-dependent tests (tokio `test-util` feature) |
| `cargo-mutants` (27.x) | mutation testing — finds code no test actually asserts on |
| `cargo-llvm-cov` (0.8) | coverage via rustc's own instrumentation |
| `mockall` (0.15) | `#[automock]` trait mocks with expectations |

## Property-Based Testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn sort_is_idempotent(mut v in prop::collection::vec(any::<i32>(), 0..100)) {
        v.sort();
        let once = v.clone();
        v.sort();
        prop_assert_eq!(v, once);
    }
}
```

## Mocking

Design against traits; mock with `mockall`:

```rust
#[mockall::automock]
pub trait Database {
    fn get_user(&self, id: u64) -> Result<User, Error>;
}

// in a test:
let mut db = MockDatabase::new();
db.expect_get_user()
    .with(mockall::predicate::eq(1))
    .times(1)
    .returning(|_| Ok(User::new("alice")));
```

## Benchmarking (criterion)

Canonical criterion example ([performance.md](performance.md) links here). Current criterion is 0.8; `criterion::black_box` is deprecated — use `std::hint::black_box`:

```rust
// benches/fib.rs
use criterion::{Criterion, criterion_group, criterion_main};
use std::hint::black_box; // criterion::black_box is deprecated — use std's

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fib(c: &mut Criterion) {
    c.bench_function("fib 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, bench_fib);
criterion_main!(benches);
```

```toml
[dev-dependencies]
criterion = "0.8"

[[bench]]
name = "fib"
harness = false
```

`black_box` prevents the optimizer from deleting the computation; without it, benchmarks of pure functions often measure nothing.

## Coverage

Prefer `cargo-llvm-cov` (accurate source-based instrumentation, works on all platforms):

```bash
cargo llvm-cov --html                          # target/llvm-cov/html
cargo llvm-cov --lcov --output-path lcov.info  # for CI upload
```

`cargo-tarpaulin` still works but llvm-cov is the default choice today.

## Async Tests

```rust
#[tokio::test(start_paused = true)] // needs tokio feature "test-util"
async fn hour_long_timeout_runs_instantly() {
    tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
}
```

With `start_paused`, tokio's clock is virtual and auto-advances when all tasks are idle — timeout/retry/backoff tests run in microseconds, deterministically. Plain `#[tokio::test]` uses a current-thread runtime; add `(flavor = "multi_thread")` to surface real races.

## Test Data Builders

Keep helpers inside the `mod tests` block (or `tests/common/mod.rs`) that uses them:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Helpers live inside the same `mod tests` (or a shared `tests/common/mod.rs`)
    struct UserBuilder {
        name: String,
        age: u32,
    }

    impl UserBuilder {
        fn new() -> Self {
            Self { name: "default".into(), age: 25 }
        }
        fn name(mut self, name: &str) -> Self {
            self.name = name.into();
            self
        }
        fn age(mut self, age: u32) -> Self {
            self.age = age;
            self
        }
        fn build(self) -> User {
            User { name: self.name, age: self.age }
        }
    }

    #[test]
    fn adult_user() {
        let user = UserBuilder::new().name("alice").age(30).build();
        assert!(user.is_adult());
    }
}
```

## Practices

- Keep tests independent: each builds its own state — shared statics make ordering matter and break parallel runs.
- Table-driven tests: iterate `(input, expected)` tuples, or use `#[rstest]` cases to get a named test per row.
- `#[should_panic(expected = "...")]` matches a substring of the panic message.
- Mark slow tests `#[ignore]`; run them with `cargo test -- --ignored`.
- CLI binaries: use `assert_cmd` — canonical example in [cli-tui.md](cli-tui.md).
