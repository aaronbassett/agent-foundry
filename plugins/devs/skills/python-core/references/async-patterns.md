# Async Patterns

Assumes 3.11+. Every block below is a complete runnable program unless marked as a fragment. `await` is only legal inside `async def` — never at module level.

## Default: TaskGroup + asyncio.timeout

Structured concurrency: children can't leak, one child's exception cancels siblings and surfaces as `ExceptionGroup` (catch with `except*`).

```python
import asyncio

async def fetch(url: str) -> str:
    await asyncio.sleep(0.1)
    return url

async def main() -> None:
    async with asyncio.timeout(5):          # cancels the whole block on expiry
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch(f"u{i}")) for i in range(3)]
    print([t.result() for t in tasks])      # all done, or ExceptionGroup raised

asyncio.run(main())
```

`asyncio.timeout()` supersedes `wait_for` (it doesn't wrap the coroutine, composes with TaskGroup, raises `TimeoutError`).

## gather vs TaskGroup

| Need | Use |
|---|---|
| Fail-fast, no orphaned tasks | `TaskGroup` (default) |
| Collect all results *including* exceptions | `gather(*aws, return_exceptions=True)` |
| Fire-and-forget background task | `asyncio.create_task` — but **keep a reference** (bare tasks get GC'd mid-flight) and add a done-callback |

Plain `gather()` without `return_exceptions` leaves siblings running after one fails — the classic leak.

## Producer/consumer that terminates

A `while True` consumer with no shutdown path deadlocks the program: producer finishes, consumer blocks on `get()` forever. Use a sentinel (one per consumer):

```python
import asyncio

STOP = object()

async def producer(q: asyncio.Queue) -> None:
    for i in range(5):
        await q.put(i)
    await q.put(STOP)                       # one sentinel per consumer

async def consumer(q: asyncio.Queue) -> None:
    while (item := await q.get()) is not STOP:
        print("got", item)

async def main() -> None:
    q: asyncio.Queue = asyncio.Queue(maxsize=2)   # bounded = backpressure
    async with asyncio.TaskGroup() as tg:
        tg.create_task(producer(q))
        tg.create_task(consumer(q))

asyncio.run(main())
```

Alternative for N workers: keep `while True` + `q.task_done()`, then `await q.join()` and `task.cancel()` each worker. `task_done()` is pointless unless something calls `join()`.

## Blocking calls

One blocking call stalls the whole event loop. Escape hatches:

```python
import asyncio, hashlib

async def main() -> None:
    digest = await asyncio.to_thread(hashlib.sha256, b"x" * 10_000_000)
    print(digest.hexdigest()[:8])

asyncio.run(main())
```

`asyncio.to_thread` for blocking I/O or GIL-releasing C calls; `loop.run_in_executor(ProcessPoolExecutor(), ...)` for pure-Python CPU work. Never call `time.sleep`, `requests`, or sync DB drivers in a coroutine.

## Holding a lock across await (fragment — bug pattern)

```python
# FRAGMENT: the await inside the critical section suspends while
# holding the lock; slow peers serialize the whole system, and
# re-entering the same lock in a callee deadlocks.
async with self._lock:
    data = await slow_network_call()   # move this OUT of the lock
    self._cache[key] = data            # keep only mutation inside
```

Do the awaiting first, take the lock only around shared-state mutation.

## Gotchas

- Semaphore for concurrency limits: `async with sem:` inside the task fn, tasks still all created up front.
- `asyncio.run()` once, at the entry point — not per call.
- Async generators/context managers run fine under TaskGroup; don't span a generator across tasks.
