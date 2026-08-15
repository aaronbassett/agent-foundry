# Common Rust Errors and Solutions

Modern rustc diagnostics print the fix for most borrow/lifetime/move errors — read them. This file covers the cases where the compiler's suggestion is missing, misleading, or points at the wrong line.

## Two `&mut` into one collection (E0499)

```rust
fn fix(vec: &mut [i32]) {
    // let (a, b) = (&mut vec[0], &mut vec[1]);  // E0499

    let (left, right) = vec.split_at_mut(1);
    let (first, second) = (&mut left[0], &mut right[0]);
    *first += *second;

    // Also: vec.iter_mut() for all elements; [T]::get_disjoint_mut for arbitrary indices
}
```

## Read-then-insert on a map (E0502)

Don't `get` then `insert` — the entry API does it in one borrow:

```rust
fn count(map: &mut std::collections::HashMap<String, i32>, key: &str) {
    *map.entry(key.to_string()).or_insert(0) += 1;
}
```

## E0507: cannot move out of captured variable in an `Fn` closure

Confusing because the closure body looks fine — the issue is the closure could be called twice, so it can't give away its capture:

```rust
fn make() -> impl Fn() -> String {
    let s = String::from("hi");
    move || s.clone() // `move || s` is E0507: Fn may run again, s already gone
}
```

Fixes: clone inside the closure; take `FnOnce` if it's genuinely single-shot; or store `Option<T>` and `.take()` it in an `FnMut`.

## `future cannot be sent between threads safely` (tokio::spawn)

The error points at the `spawn` call, not the cause. The cause is a non-`Send` value (`Rc`, `RefCell`, `std::sync::MutexGuard`, raw pointer) **held across an `.await`** inside the future:

```rust
async fn bad(mutex: &std::sync::Mutex<i32>) {
    let guard = mutex.lock().unwrap();
    some_io().await; // guard alive across await → whole future is !Send
    drop(guard);
}
```

Fixes: drop/scope the guard before the `.await`; use `tokio::sync::Mutex` if you must hold it across awaits; replace `Rc`/`RefCell` with `Arc`/`Mutex`. Scan the rustc note "`X` is not `Send`... held across an await point" — it names the exact value and await.

## `borrowed data escapes` / lifetime errors in spawned tasks

`tokio::spawn` (and `std::thread::spawn`) require `'static` futures — they may outlive the caller, so they cannot borrow from it:

```rust
fn start(config: &Config) {
    let config = config.clone(); // move an owned copy in
    tokio::spawn(async move { run(config).await });
}
```

Same pattern for `Arc::clone` when the data is shared. For borrowing threads, `std::thread::scope` allows non-`'static` borrows.

## Integer division

```rust
// checked_div returns None for a zero divisor — no separate y == 0 check needed.
// Integer-only concern: float division never panics (gives ±inf/NaN).
let result = x.checked_div(y).ok_or(Error::DivisionByZero)?;
```

## Quick fixes

| Error | Quick fix |
|-------|-----------|
| Value moved (E0382) | `.clone()`, or borrow with `&` |
| Two mutable borrows (E0499) | `split_at_mut`, `iter_mut`, or narrow scope with `{}` |
| Immutable + mutable borrow (E0502) | Entry API for maps; split into sequential statements |
| Move out of `Fn` closure (E0507) | Clone inside, `FnOnce`, or `Option::take` |
| Missing lifetime (E0106) | Annotate: `fn f<'a>(x: &'a str) -> &'a str` |
| Trait bound not satisfied (E0277) | Add bound or `#[derive(...)]`; for `Display` in generics, often want `Debug` |
| Type mismatch | `.into()` / `.try_into()?` |
| Cannot infer type (E0282) | Annotate binding or turbofish `collect::<Vec<_>>()` |
| Index panic | `.get(i)` returning `Option` instead of `[i]` |
| Future not `Send` | Drop non-`Send` guard before `.await`; `tokio::sync::Mutex` |
| Borrowed data escapes into spawn (E0521) | Move owned/`Arc` clones into `async move` |
| `Rc`/`RefCell` across threads (E0277) | `Arc` / `Mutex` (or `RwLock`) |
