# Async Patterns (Tokio)

Canonical home for retry-with-backoff and the actor pattern.

## Async Closures (Rust 1.85+)

Bound generic callers with `AsyncFn` / `AsyncFnMut` / `AsyncFnOnce`:

```rust
async fn for_each<F>(items: &[u32], mut f: F)
where
    F: AsyncFnMut(u32),
{
    for &i in items {
        f(i).await;
    }
}

async fn demo() {
    let mut total = 0;
    // The body may borrow captures across .await — the pre-1.85
    // `|n| async move { ... }` workaround couldn't.
    for_each(&[1, 2, 3], async |n| total += n).await;
}
```

## Blocking Work

Blocking a worker thread (`std::thread::sleep`, sync I/O, CPU loops) stalls every task on it:

```rust
tokio::time::sleep(dur).await;                                  // not std::thread::sleep
let n = tokio::task::spawn_blocking(move || heavy_compute()).await?; // sync I/O + CPU work
```

The blocking pool is separate (default 512 threads); a running closure is **not** stopped by `abort()`. For data-parallel CPU work, use rayon bridged via oneshot.

## Concurrency

- `join!` / `try_join!` (fail-fast) run futures concurrently **on the same task** — no parallelism unless each is `tokio::spawn`ed.
- `select!` races branches and **drops the losers**, so every branch must be cancellation-safe (`mpsc::Receiver::recv` is; partial buffered reads are not). `biased;` makes polling order deterministic top-down.
- Spawned-task panics surface only via `handle.await` → `Err(JoinError)`.

## Async Traits

`async fn` in a trait (1.75+) desugars to return-position `impl Trait` (RPITIT) with **no `Send` bound** — generic code can't `tokio::spawn` the result ("future cannot be sent between threads safely"):

```rust
trait Fetch {
    async fn fetch(&self, id: u64) -> String; // = `-> impl Future<...>` with NO Send bound
}

// Fix 1: desugar and add the bound yourself:
//   fn fetch(&self, id: u64) -> impl Future<Output = String> + Send;
// Fix 2: let the trait-variant crate generate a Send variant:
#[trait_variant::make(FetchSend: Send)]
trait FetchLocal {
    async fn fetch(&self, id: u64) -> String;
}

fn spawn_it<T: FetchSend + Sync + 'static>(t: T) -> tokio::task::JoinHandle<String> {
    tokio::spawn(async move { t.fetch(1).await }) // fails to compile with plain `Fetch`
}
```

`async fn` traits are also not dyn-compatible; for `Box<dyn Trait>` use the `async-trait` crate (boxes the future, `Send` by default).

## Streams

`chunks` and `buffered` are on `futures::StreamExt`, **not** `tokio_stream::StreamExt` (whose `filter` takes a sync predicate, unlike futures' async one); importing both causes ambiguity — pick one.

```rust
use futures::StreamExt; // NOT tokio_stream::StreamExt

async fn batched(stream: impl futures::Stream<Item = Item>) {
    // Combinators take `self`: chain once, pin, then iterate.
    let mut chunks = std::pin::pin!(stream.chunks(10)); // yields Vec<Item>
    while let Some(batch) = chunks.next().await {
        process_batch(batch).await;
    }
}

async fn concurrent(urls: Vec<String>) -> Vec<Data> {
    futures::stream::iter(urls)
        .map(fetch) // fetch: async fn(String) -> Data
        .buffered(10) // ≤10 in flight, output order preserved (buffer_unordered: any order)
        .collect()
        .await
}
```

## Channels (tokio::sync)

| Channel | Shape | Notes |
|---------|-------|-------|
| `mpsc::channel(n)` | many → one | bounded; `send().await` is the backpressure |
| `mpsc::unbounded_channel()` | many → one | `send` never waits — unbounded memory risk |
| `oneshot` | one value | request/response reply |
| `broadcast::channel(n)` | many → many | slow receivers get `Err(Lagged)`, skip ahead |
| `watch` | one → many | latest value only; intermediates lost |

## Locks

Default to `std::sync::Mutex` for short, await-free critical sections; `tokio::sync::Mutex` only when a guard genuinely must live across `.await`:

```rust
// Bad: guard held across an await — serializes all tasks, deadlock-prone
async fn bad(mutex: &Mutex<Data>) {
    let mut guard = mutex.lock().await;
    some_async_function().await; // still holding the lock!
    *guard = new_value();
}

// Good: drop the guard before awaiting; re-lock to write
async fn good(mutex: &Mutex<Data>) {
    let _snapshot = mutex.lock().await.clone(); // guard dropped immediately
    some_async_function().await;
    *mutex.lock().await = new_value();
}
```

clippy's `await_holding_lock` flags `std` guards held across `.await` (they usually fail the `Send` check anyway).

## Bounding Concurrency

Don't spawn a task per element of an unbounded collection — bound with `.buffered(n)` (above) or `tokio::sync::Semaphore` (clone the `Arc`, `acquire_owned().await`, move the permit into the task; dropping it releases).

## Timeout and Cancellation

`tokio::time::timeout(dur, fut).await` → `Err(Elapsed)`. Cancellation is dropping a future (all `select!` does); `handle.abort()` for spawned tasks; `tokio_util::sync::CancellationToken` for shutdown trees.

## Retry with Backoff

```rust
async fn retry_with_backoff<F, Fut, T, E>(mut op: F, max_attempts: u32) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    let mut attempt = 0;
    loop {
        match op().await {
            Ok(v) => return Ok(v),
            Err(e) if attempt + 1 >= max_attempts => return Err(e),
            Err(_) => {
                attempt += 1;
                tokio::time::sleep(Duration::from_millis(100 * 2u64.pow(attempt))).await;
            }
        }
    }
}
```

Call: `retry_with_backoff(|| fetch_data("url"), 5).await?` — add jitter in production.

## Actor Pattern

One task owns the state; callers talk over channels — no locks; the bounded mailbox is backpressure:

```rust
use tokio::sync::{mpsc, oneshot};

enum Msg {
    Get { reply: oneshot::Sender<u64> },
    Add(u64),
}

struct Actor {
    rx: mpsc::Receiver<Msg>,
    state: u64,
}

impl Actor {
    async fn run(mut self) {
        while let Some(msg) = self.rx.recv().await {
            match msg {
                Msg::Get { reply } => {
                    let _ = reply.send(self.state);
                }
                Msg::Add(n) => self.state += n,
            }
        }
    } // loop ends when every Handle is dropped
}

#[derive(Clone)]
pub struct Handle {
    tx: mpsc::Sender<Msg>,
}

impl Handle {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel(32);
        tokio::spawn(Actor { rx, state: 0 }.run());
        Handle { tx }
    }

    pub async fn add(&self, n: u64) {
        self.tx.send(Msg::Add(n)).await.expect("actor died");
    }

    pub async fn get(&self) -> u64 {
        let (reply, rx) = oneshot::channel();
        self.tx.send(Msg::Get { reply }).await.expect("actor died");
        rx.await.expect("actor died")
    }
}
```
