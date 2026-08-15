# AI & LLM Integration

Calling LLM APIs and running local models from Rust; versions verified against crates.io, August 2026.

## Model IDs rot

Every provider retires model names on its own schedule. Declare the model once as a `const` with a verify-before-shipping comment — never scatter string literals across call sites.

## Anthropic Messages API (reqwest + serde)

There is no official Anthropic Rust SDK; the supported path is raw HTTP against `POST /v1/messages` with `x-api-key` and `anthropic-version: 2023-06-01` headers.

```toml
[dependencies]
anyhow = "1"                                         # 1.0.104
reqwest = { version = "0.13", features = ["json"] }  # 0.13.4
serde = { version = "1", features = ["derive"] }     # 1.0.229
serde_json = "1"                                     # 1.0.151
tokio = { version = "1", features = ["full"] }       # 1.53.1
```

A complete tool-use loop: send tool schemas, execute any `tool_use` blocks the model returns, feed `tool_result`s back, repeat until `stop_reason` is no longer `"tool_use"`. Response `content` deliberately stays `Vec<serde_json::Value>`: unknown block types (e.g. `thinking`) must be echoed back unchanged, and a typed enum would silently drop their fields.

```rust
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

// Model IDs rot — verify current IDs against the provider's docs before shipping.
const MODEL: &str = "claude-opus-5";
const API_URL: &str = "https://api.anthropic.com/v1/messages";

#[derive(Serialize)]
struct MessagesRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    messages: &'a [Value],
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<&'a [Value]>,
}

#[derive(Deserialize)]
struct MessagesResponse {
    content: Vec<Value>, // raw Values: unknown block types must round-trip unchanged
    stop_reason: String,
}

fn call_tool(name: &str, input: &Value) -> String {
    match name {
        "get_weather" => format!("18C, overcast in {}", input["city"].as_str().unwrap_or("?")),
        _ => format!("unknown tool: {name}"),
    }
}

async fn chat(client: &reqwest::Client, api_key: &str, prompt: &str) -> anyhow::Result<()> {
    let tools = [json!({
        "name": "get_weather",
        "description": "Get current weather for a city.",
        "input_schema": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"]
        }
    })];
    let mut messages = vec![json!({"role": "user", "content": prompt})];

    loop {
        let resp: MessagesResponse = client
            .post(API_URL)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&MessagesRequest {
                model: MODEL,
                max_tokens: 1024,
                messages: &messages,
                tools: Some(&tools),
            })
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let mut tool_results = Vec::new();
        for block in &resp.content {
            match block["type"].as_str() {
                Some("text") => println!("{}", block["text"].as_str().unwrap_or_default()),
                Some("tool_use") => tool_results.push(json!({
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": call_tool(block["name"].as_str().unwrap_or(""), &block["input"]),
                })),
                _ => {} // thinking etc. — nothing to do; echoed back verbatim below
            }
        }
        if resp.stop_reason != "tool_use" {
            return Ok(());
        }
        // Echo the assistant turn verbatim, then answer every tool_use in ONE user turn.
        messages.push(json!({"role": "assistant", "content": resp.content}));
        messages.push(json!({"role": "user", "content": tool_results}));
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let api_key = std::env::var("ANTHROPIC_API_KEY")?;
    chat(&reqwest::Client::new(), &api_key, "What's the weather in Paris?").await
}
```

Newer Claude models can return HTTP 200 with `stop_reason: "refusal"` — branch on `stop_reason` before trusting `content`.

## Streaming (SSE)

Add `"stream": true` to the request body (a `stream: bool` field on `MessagesRequest`). The response is Server-Sent Events: consume `resp.bytes_stream()` (reqwest's `stream` feature) through `eventsource-stream` (0.2.3), match on the event name, and append `text_delta` payloads from `content_block_delta` events. Buffer `input_json_delta` fragments per block index before parsing tool inputs.

## OpenAI-compatible APIs (async-openai)

`async-openai` (0.41 — everything is builders behind feature flags now; the old struct-literal API is gone) targets any OpenAI-compatible server: vLLM, llama.cpp, OpenRouter, Ollama's `/v1`. Add `async-openai = { version = "0.41", features = ["chat-completion"] }`.

```rust
use async_openai::{
    Client,
    config::OpenAIConfig,
    types::chat::{ChatCompletionRequestUserMessageArgs, CreateChatCompletionRequestArgs},
};

// Model names differ per server and hosted providers rotate theirs — nothing is
// safe to hardcode here. Check your provider's docs or `GET {base_url}/models`.
const MODEL: &str = "/* check provider docs */";

pub async fn complete(prompt: &str) -> anyhow::Result<String> {
    let config = OpenAIConfig::new()
        .with_api_base("http://localhost:11434/v1") // e.g. Ollama's OpenAI-compat endpoint
        .with_api_key(std::env::var("LLM_API_KEY").unwrap_or_default());
    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model(MODEL)
        .messages([ChatCompletionRequestUserMessageArgs::default()
            .content(prompt)
            .build()?
            .into()])
        .build()?;

    let response = client.chat().create(request).await?;
    Ok(response.choices[0].message.content.clone().unwrap_or_default())
}
```

## Local models

**Ollama** serves two HTTP APIs on `localhost:11434`: the native one (`POST /api/chat`, `/api/generate`, `/api/embed` — NDJSON-streamed unless `"stream": false`) and the OpenAI-compatible `/v1` the example above targets. `ollama-rs` (0.3) wraps the native API with typed bindings. List installed models via `GET /api/tags`; don't hardcode local model names either.

- **candle** (`candle-core` 0.11) — Hugging Face's minimalist in-process tensor/inference framework; run models without a server.
- **rig** (`rig-core` 0.41) — higher-level LLM app framework (provider abstractions, agents, RAG) once hand-rolled HTTP outgrows a few call sites.

## Provider-agnostic seam

```rust
/// One seam per capability; call sites never name a provider.
pub trait ChatProvider {
    fn complete(
        &self,
        prompt: &str,
    ) -> impl Future<Output = anyhow::Result<String>> + Send;
}
```

Implement per backend, inject at construction. The desugared form (rather than `async fn`) makes the `Send` bound explicit for public traits.

## Retry and backoff

Providers rate-limit (429) and shed load (5xx/overloaded). Retry only 408/429/5xx and honor `retry-after`; use the backoff patterns in [async-patterns.md](async-patterns.md) rather than inlining retry loops here.
