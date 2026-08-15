# Rust Web Frameworks

Framework selection plus current axum 0.8 / actix-web 4 idioms and the breaking changes that invalidate pre-2024 examples. Versions verified against crates.io, August 2026.

## Decision table

| | axum 0.8 | actix-web 4 |
|---|---|---|
| Status (2026) | Ecosystem default; maintained by the tokio team | Mature, actively maintained |
| Runtime | tokio | tokio via actix-rt — one single-threaded tokio runtime per worker, **not** a custom runtime |
| Middleware | tower `Layer`/`Service`, shared with tonic, hyper, tower-http | actix-specific `Transform` trait; tower layers don't apply |
| Performance | Excellent | Excellent; edges ahead in some benchmarks |
| Choose when | Default choice: APIs, microservices, anything sharing tower middleware | Top-end throughput, actor patterns, existing actix codebases |

Everything else, one line each:

- **Rocket 0.5**: near-dormant since the 0.5 release (late 2023); avoid for new services.
- **warp**: maintenance mode; its `Filter` combinators lost to axum's extractors.
- **poem / salvo**: viable, smaller communities.
- **loco**: Rails-style app framework built on axum, not an HTTP library.

## axum

```toml
[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.7", features = ["cors"] }
serde = { version = "1", features = ["derive"] }
anyhow = "1"
```

### Breaking-change landmarks

- **0.7 → 0.8 route syntax**: path params are `{id}`, not `:id`. `.route("/users/:id", …)` panics at `Router` construction ("Path segments must not start with `:`"). Wildcards are `/{*rest}`; literal braces escape as `{{`.
- **0.8 dropped `#[async_trait]`**: `FromRequestParts`/`FromRequest` use native async-fn-in-trait; an `#[async_trait]` impl no longer matches the trait.
- **0.7 degenericized bodies**: `Next<B>` → `Next`, and `axum::extract::Request` = `http::Request<axum::body::Body>`. `axum::Server` is gone — bind a `tokio::net::TcpListener`, then `axum::serve`.
- **0.8 `Option<T>` extractors** require `T: OptionalFromRequestParts`; rejections are no longer silently swallowed.
- **0.8 moved `Host`** (and friends) to `axum-extra`.

### Router and handlers

```rust
use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
struct AppState; // must be Clone; wrap non-Clone resources in Arc

#[derive(Serialize)]
struct User {
    id: u64,
    name: String,
}

#[derive(Deserialize)]
struct CreateUser {
    name: String,
}

#[derive(Deserialize)]
struct Paging {
    page: Option<u32>,
}

// 0.8 path params are `{id}` — `/users/:id` panics at Router construction
async fn get_user(Path(id): Path<u64>, Query(paging): Query<Paging>) -> Json<User> {
    let _ = paging.page;
    Json(User { id, name: "Alice".into() })
}

async fn create_user(
    State(_state): State<AppState>,
    Json(body): Json<CreateUser>, // body extractor goes last
) -> Json<User> {
    Json(User { id: 1, name: body.name })
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/users/{id}", get(get_user))
        .route("/users", post(create_user))
        .with_state(AppState);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Custom extractor

```rust
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};

struct AuthUser {
    id: u64,
}

// Native async fn in trait — no #[async_trait] since 0.8
impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "missing Authorization"))?;
        let _ = token; // validate for real here
        Ok(AuthUser { id: 1 })
    }
}

async fn protected(user: AuthUser) -> String {
    format!("hello, user {}", user.id)
}
```

### Middleware

```rust
use axum::{
    extract::Request, // = http::Request<axum::body::Body>
    http::StatusCode,
    middleware::{self, Next}, // Next lost its <B> generic in 0.7
    response::Response,
    routing::get,
    Router,
};
use tower_http::cors::CorsLayer;

async fn require_auth(req: Request, next: Next) -> Result<Response, StatusCode> {
    if !req.headers().contains_key("Authorization") {
        return Err(StatusCode::UNAUTHORIZED);
    }
    Ok(next.run(req).await)
}

fn app() -> Router {
    Router::new()
        .route("/protected", get(|| async { "ok" }))
        .layer(middleware::from_fn(require_auth))
        .layer(CorsLayer::permissive()) // any tower Layer composes here
}
```

`middleware::from_fn_with_state` also injects `State`. Request tracing setup lives in [logging-observability.md](logging-observability.md).

### Error handling

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};

struct AppError(anyhow::Error);

// `?` now works on anything convertible to anyhow::Error
impl<E: Into<anyhow::Error>> From<E> for AppError {
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // log self.0 here — wiring in logging-observability.md
        (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
    }
}

async fn read_config() -> Result<Json<String>, AppError> {
    let raw = tokio::fs::read_to_string("config.json").await?; // io::Error → AppError
    Ok(Json(raw))
}
```

### Gotchas

- Handler-trait errors are unreadable; annotate with `#[axum::debug_handler]` for a real diagnostic.
- At most one body-consuming extractor (`Json`, `Form`, `Bytes`) per handler, and it must be the final argument.
- Handlers must be `Send`: holding a `std::sync::MutexGuard` across `.await` fails with an opaque trait error.
- Multiple state types: implement `FromRef` for sub-states instead of nesting `Extension`s.

## actix-web

```toml
[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
```

```rust
use actix_web::{web, App, HttpServer, Responder};
use serde::Serialize;

#[derive(Serialize)]
struct User {
    id: u64,
    name: String,
}

async fn get_user(path: web::Path<u64>) -> impl Responder {
    web::Json(User { id: *path, name: "Alice".into() })
}

#[actix_web::main] // actix-rt = one single-threaded tokio runtime per worker
async fn main() -> std::io::Result<()> {
    let state = web::Data::new(42u64); // build once, clone per worker
    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .route("/users/{id}", web::get().to(get_user))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

- tokio libraries (sqlx, reqwest) work unchanged; tasks spawned via `actix_web::rt::spawn` must be `'static` but need not be `Send` (single-threaded workers).
- Build `web::Data` **outside** `HttpServer::new` and clone it in, or each worker constructs its own instance.
- Route syntax has always been `{id}` — no 0.7/0.8-style migration.
