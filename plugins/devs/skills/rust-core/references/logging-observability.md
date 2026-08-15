# Logging and Observability in Rust

Use `tracing` for anything new — async-aware, structured, spans for context. `log`-based events from dependencies are captured automatically by `tracing-subscriber`'s fmt layer (`tracing-log` default feature). Versions verified August 2026: tracing 0.1 / tracing-subscriber 0.3, opentelemetry + opentelemetry_sdk + opentelemetry-otlp 0.32, tracing-opentelemetry 0.33, metrics 0.24, metrics-exporter-prometheus 0.18, console-subscriber 0.5, tower-http 0.7.

## tracing essentials

```rust
use tracing::{error, info, instrument};

fn essentials(user_id: u64, err: std::io::Error) {
    // Structured fields, not interpolation. ? = Debug, % = Display.
    info!(user_id, "user logged in");
    error!(error = ?err, "request failed");
}

// Spans via attribute: skip secrets, add computed fields, log Err returns.
#[instrument(skip(password), fields(user_len = user.len()), err)]
async fn login(user: &str, password: &str) -> Result<u64, std::io::Error> {
    info!("attempting login");
    Ok(42)
}
```

Init with env filtering; `.json()` in production, `.pretty()` in development:

```rust
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn init_tracing() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,myapp=debug".into()))
        .with(fmt::layer().json())
        .init();
}
```

Filter syntax: `RUST_LOG=warn,myapp::api=debug`.

Gotcha: never hold `span.enter()`/`entered()` guards across `.await` — the span leaks into unrelated tasks. Use `#[instrument]`, or for spawned tasks `tokio::spawn(work().instrument(Span::current()))` (`tracing::Instrument`).

## OpenTelemetry (OTLP)

The pre-0.24 `new_pipeline()...install_batch(runtime::Tokio)` API no longer exists. Current shape:

```toml
[dependencies]
opentelemetry = "0.32"
opentelemetry_sdk = "0.32"
opentelemetry-otlp = { version = "0.32", features = ["grpc-tonic"] }
tracing-opentelemetry = "0.33"
```

```rust
use opentelemetry::global;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_otlp::{SpanExporter, WithExportConfig};
use opentelemetry_sdk::{trace::SdkTracerProvider, Resource};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn init_otel() -> Result<SdkTracerProvider, Box<dyn std::error::Error>> {
    let exporter = SpanExporter::builder()
        .with_tonic()
        .with_endpoint("http://localhost:4317")
        .build()?;

    let provider = SdkTracerProvider::builder()
        .with_resource(Resource::builder().with_service_name("my-service").build())
        .with_batch_exporter(exporter) // batching; no runtime argument since 0.28
        .build();

    global::set_tracer_provider(provider.clone());

    tracing_subscriber::registry()
        .with(tracing_opentelemetry::layer().with_tracer(provider.tracer("my-service")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    Ok(provider)
}
```

`global::shutdown_tracer_provider()` was removed: hold the returned provider and call `provider.shutdown()?` before exit, or batched spans are silently dropped.

## Metrics + Prometheus

The recorder is a global — install it exactly once; a second `install()` returns an error and older docs that installed twice panicked. One builder call sets up both the recorder and the scrape endpoint, and must run inside the Tokio runtime:

```rust
use metrics::{counter, gauge, histogram};
use metrics_exporter_prometheus::PrometheusBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    PrometheusBuilder::new()
        .with_http_listener(([0, 0, 0, 0], 9090)) // GET /metrics
        .install()?;

    loop {
        counter!("requests_total", "method" => "GET").increment(1);
        gauge!("active_connections").set(42.0);
        histogram!("request_duration_ms").record(123.45);
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}
```

(End the function with the `loop` — code after it is unreachable.)

## Sampling high-volume events

rand renamed `thread_rng()`/`gen_ratio()` to `rng()`/`random_ratio()` in 0.9; in 0.10 the method moved to the `RngExt` trait:

```rust
use rand::RngExt;
use tracing::debug;

fn maybe_log() {
    if rand::rng().random_ratio(1, 100) { // 1% sampling
        debug!("high-frequency event");
    }
}
```

## tokio-console

```rust
console_subscriber::init(); // console-subscriber = "0.5"
```

Then run `tokio-console`. Requires building with `RUSTFLAGS="--cfg tokio_unstable"` and tokio's `tracing` feature.

## Axum TraceLayer

Canonical reference — [web-frameworks.md](web-frameworks.md) links here. `tower-http = { version = "0.7", features = ["trace"] }`.

```rust
use axum::{routing::get, Router};
use tower_http::trace::TraceLayer;
use tracing::Level;

fn router() -> Router {
    Router::new()
        .route("/", get(|| async { "ok" }))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|req: &axum::http::Request<axum::body::Body>| {
                    tracing::span!(Level::INFO, "http_request",
                        method = %req.method(), path = %req.uri().path())
                })
                .on_response(
                    |res: &axum::http::Response<axum::body::Body>,
                     latency: std::time::Duration,
                     _span: &tracing::Span| {
                        tracing::info!(status = %res.status(),
                            latency_ms = latency.as_millis(), "finished request");
                    },
                ),
        )
}
```

The defaults (`TraceLayer::new_for_http()` alone) are fine for development; customize `make_span_with` to attach request IDs.

## Practices

- Fields, not format strings: `info!(user = %name, "logged in")` — parseable, queryable.
- Levels: `error` = unrecoverable, `warn` = recovered/retrying, `info` = state changes, `debug` = diagnostics, `trace` = per-item detail.
- Never log secrets; `#[instrument]` records all arguments unless you `skip` them.
- Dynamic level changes at runtime: `tracing_subscriber::reload::Layer` wrapping an `EnvFilter`.
