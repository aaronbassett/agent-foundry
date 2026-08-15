# Rust Design Patterns

Canonical home for builder, newtype, typestate, RAII, and the Rc/Arc-overuse anti-pattern. Actor and other async patterns: [async-patterns.md](async-patterns.md).

## Builder

For types with many optional parameters. Consuming (`mut self`) setters chain without clones:

```rust
pub struct ServerConfigBuilder {
    host: String,
    port: u16,
    timeout: Option<Duration>,
}

impl ServerConfigBuilder {
    pub fn new() -> Self {
        Self { host: "127.0.0.1".into(), port: 8080, timeout: None }
    }
    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }
    pub fn build(self) -> ServerConfig {
        ServerConfig { host: self.host, port: self.port, timeout: self.timeout }
    }
}

let config = ServerConfigBuilder::new().host("0.0.0.0").build();
```

Crates: `bon` (3.x) generates typestate builders — a missing required field is a compile error; `derive_builder` (0.20) instead returns `Result` from `build()` at runtime.

## Typestate

Encode state machines in the type system; invalid transitions fail to compile:

```rust
pub struct Locked;
pub struct Unlocked;

pub struct Door<State = Locked> {
    _state: PhantomData<State>,
}

impl Door<Locked> {
    pub fn new() -> Self {
        Door { _state: PhantomData }
    }
    pub fn unlock(self, key: &Key) -> Result<Door<Unlocked>, Error> {
        if key.is_valid() {
            Ok(Door { _state: PhantomData })
        } else {
            Err(Error::InvalidKey)
        }
    }
}

impl Door<Unlocked> {
    pub fn open(&self) {}
    pub fn lock(self) -> Door<Locked> {
        Door { _state: PhantomData }
    }
}

// let door = Door::new();
// door.open();                    // compile error: no `open` on Door<Locked>
// door.unlock(&key)?.open();      // OK
```

Transitions take `self` by value, so stale pre-transition handles cannot be reused.

## Newtype

Wrap a type for domain safety — parse, don't validate:

```rust
pub struct UserId(u64);
pub struct ProductId(u64);
// get_user(ProductId(42)) is now a compile error

pub struct Email(String);

impl Email {
    pub fn parse(s: String) -> Result<Self, ValidationError> {
        if s.contains('@') { Ok(Email(s)) } else { Err(ValidationError::InvalidEmail) }
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
```

Expose `as_str()` / `AsRef<str>`, not `Deref` (see anti-patterns below).

The newtype is also the standard **orphan-rule** workaround. A trait impl requires the trait or the type to be local; wrapping a foreign type makes it local:

```rust
// Orphan rule: a trait impl needs the trait or the type to be local.
// A newtype makes a foreign type local, so foreign-trait-for-foreign-type works:
struct Wrapper(Vec<u8>);

impl std::fmt::Display for Wrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} bytes", self.0.len())
    }
}
```

## Extension Trait

Add methods to a foreign type (no orphan issue — the trait is local):

```rust
pub trait StrExt {
    fn truncate_to(&self, max: usize) -> String;
}

impl StrExt for str {
    fn truncate_to(&self, max: usize) -> String {
        if self.len() <= max { self.into() } else { format!("{}...", &self[..max]) }
    }
}
// callers must `use crate::StrExt;` to see the method
```

## Sealed Trait

Prevent downstream impls so you can extend the trait without a breaking change:

```rust
mod sealed {
    pub trait Sealed {}
}

pub trait MyTrait: sealed::Sealed {}

pub struct AllowedType;
impl sealed::Sealed for AllowedType {}
impl MyTrait for AllowedType {}
// external crates can name MyTrait but cannot implement sealed::Sealed
```

## RAII

Tie cleanup to `Drop` so early returns and panics can't leak resources:

```rust
impl Drop for FileGuard {
    fn drop(&mut self) {
        let _ = self.file.sync_all(); // Drop can't return errors...
    }
}
```

`Drop` can neither return errors nor `.await` — for fallible or async cleanup, also provide an explicit `close(self) -> Result<()>` and treat `Drop` as the fallback.

## Strategy

Runtime-selected algorithm = a trait-object field (`Box<dyn Compression>`); compile-time-fixed algorithm = a generic parameter (no vtable, monomorphized). Don't reach for `Box<dyn>` when the caller already knows the concrete type.

## Worker Pool (channels)

```rust
use std::sync::{Arc, Mutex, mpsc};
use std::thread;

enum WorkerMessage {
    Task(Box<dyn FnOnce() + Send>),
    Shutdown,
}

pub struct WorkerPool {
    sender: mpsc::Sender<WorkerMessage>,
    // Option so Drop can take() each handle — JoinHandle::join needs ownership,
    // but Drop only gets &mut self.
    workers: Vec<Option<thread::JoinHandle<()>>>,
}

impl WorkerPool {
    pub fn new(size: usize) -> Self {
        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let workers = (0..size)
            .map(|_| {
                let receiver = Arc::clone(&receiver);
                Some(thread::spawn(move || {
                    loop {
                        match receiver.lock().unwrap().recv() {
                            Ok(WorkerMessage::Task(task)) => task(),
                            Ok(WorkerMessage::Shutdown) | Err(_) => break,
                        }
                    }
                }))
            })
            .collect();

        WorkerPool { sender, workers }
    }

    pub fn execute(&self, task: impl FnOnce() + Send + 'static) {
        self.sender.send(WorkerMessage::Task(Box::new(task))).unwrap();
    }
}

impl Drop for WorkerPool {
    fn drop(&mut self) {
        for _ in &self.workers {
            let _ = self.sender.send(WorkerMessage::Shutdown);
        }
        for worker in &mut self.workers {
            if let Some(handle) = worker.take() {
                handle.join().unwrap();
            }
        }
    }
}
```

For async message-based state (actor pattern), see [async-patterns.md](async-patterns.md).

## Anti-Patterns

### Deref Polymorphism

Don't implement `Deref` to fake inheritance or leak a newtype's inner API:

```rust
// Don't do this!
struct MyString(String);

impl Deref for MyString {
    type Target = String;
    fn deref(&self) -> &String { &self.0 }
}
```

It auto-exposes every inner method (bypassing your invariants), confuses inference, and surprises readers. Provide `as_str()` / `AsRef` instead. `Deref` is for smart pointers (`Box`, `Arc`, guards) only.

### Clone to Satisfy the Borrow Checker

`data.clone()` to silence a lifetime error hides the design problem and costs allocations. Restructure to borrow, or split the struct/scope that's causing overlapping borrows.

### Overusing Rc/Arc

```rust
// Bad: shared ownership by reflex
struct App {
    config: Arc<Config>,
    cache: Arc<Cache>,
}
```

```rust
// Good: own the data, hand out borrows
struct App {
    config: Config,
    cache: Cache,
}
```

Reach for `Arc` only when lifetimes genuinely overlap unpredictably (spawned tasks, caches shared across threads). `Arc<Mutex<T>>` everywhere usually means the ownership tree was never designed.

## Pattern Selection Guide

| Need | Pattern |
|------|---------|
| Many optional parameters | Builder (`bon`, `derive_builder`, or hand-rolled) |
| Compile-time state machine | Typestate |
| Type safety for primitives / domain values | Newtype |
| Foreign trait on foreign type | Newtype wrapper (orphan rule) |
| Add methods to a foreign type | Extension trait |
| Trait others can name but not implement | Sealed trait |
| Guaranteed cleanup | RAII / `Drop` (+ explicit `close()` if fallible) |
| Swappable algorithm at runtime | Strategy via `Box<dyn Trait>` |
| Swappable algorithm at compile time | Generics |
| Shared mutable state across threads | `Arc<Mutex<T>>` — last resort |
| Message-based concurrency | Channels / worker pool; async: actor ([async-patterns.md](async-patterns.md)) |
| Undo/redo, queued operations | Command (trait objects in a `Vec`) |
