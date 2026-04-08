# agentbin CLI Reference

Source: https://github.com/aaronbassett/agentbin

## Installation Methods

### Homebrew (macOS/Linux)

```sh
brew install aaronbassett/tap/agentbin
```

### Cargo

```sh
cargo install agentbin
```

### GitHub Releases

Download pre-built binaries from https://github.com/aaronbassett/agentbin/releases

Platforms: macOS (aarch64, x86_64), Linux (aarch64, x86_64), Windows (x86_64).

---

## Key Management

### Generate a Key Pair

```sh
agentbin keygen
```

Creates an Ed25519 private key at `~/.config/agentbin/key.pem` and prints the public key. The public key must be registered on the server before uploading.

### Custom Key Path

```sh
agentbin --key-file /path/to/key.pem upload file.html
```

Or via environment variable:

```sh
export AGENTBIN_KEY_FILE=/path/to/key.pem
```

---

## Upload Command

```
agentbin upload <FILE> [OPTIONS]
```

### Options

| Flag | Description |
|------|-------------|
| `--uid <UID>` | Upload as new version of an existing upload |
| `--title <TITLE>` | Title metadata; used to generate URL slug |
| `--description <DESC>` | Description metadata |
| `--tags <TAG>` | Tags (use multiple times for multiple tags) |
| `--agent-model <MODEL>` | Agent model name (e.g., `claude-opus-4-6`) |
| `--agent-provider <PROVIDER>` | Agent provider name (e.g., `anthropic`) |
| `--agent-tool <TOOL>` | Agent tool name |
| `--trigger <TRIGGER>` | Trigger context description |
| `--meta <KEY=VALUE>` | Custom key-value metadata (repeatable) |
| `--collection <NAME>` | Assign to a named collection |
| `--expiry <DAYS>` | Auto-expire after N days |

### Global Options

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON |
| `--server-url <URL>` | Server URL (or set `AGENTBIN_SERVER_URL`) |
| `--key-file <PATH>` | Path to Ed25519 private key (or set `AGENTBIN_KEY_FILE`) |

---

## Other Commands

### List Uploads

```sh
agentbin list [--json]
```

### Delete a Version

```sh
agentbin delete <UID> <VERSION>
```

### Collection Management

```sh
agentbin collection add <COLLECTION_NAME> <UID>
agentbin collection remove <COLLECTION_NAME> <UID>
```

### Admin Commands (requires admin key)

```sh
agentbin admin add <USERNAME> <PUBLIC_KEY> [--name "Display Name"] [--admin]
agentbin admin update <USERNAME> [--name "New Name"] [--admin true|false]
agentbin admin remove <USERNAME>
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTBIN_SERVER_URL` | Server URL for all commands |
| `AGENTBIN_KEY_FILE` | Path to Ed25519 private key |

---

## URL Patterns

All uploaded files are accessible at these URL patterns:

| Pattern | Description |
|---------|-------------|
| `/{uid}` | View latest version (rendered HTML page) |
| `/{uid}/v{N}` | View specific version N |
| `/{uid}/raw` | Raw content of latest version |
| `/{uid}/v{N}/raw` | Raw content of specific version N |
| `/c/{name}` | Collection overview page with timeline |

The `{uid}` is a short alphanumeric identifier. When a title is provided, the URL includes a slug: `/{uid}-{slugified-title}`.

---

## Supported File Types

File type is detected from the file extension:

| Extension(s) | Type | Rendering |
|--------------|------|-----------|
| `.html`, `.htm` | HTML | Passthrough (rendered as-is) |
| `.md`, `.markdown` | Markdown | Rendered GFM with syntax highlighting |
| `.json` | JSON | Syntax-highlighted |
| `.jsonc` | JSONC | Syntax-highlighted |
| `.toml` | TOML | Syntax-highlighted |
| `.yaml`, `.yml` | YAML | Syntax-highlighted |
| `.xml` | XML | Syntax-highlighted |
| `.rst` | reStructuredText | Rendered |
| Other | Plain text | Displayed as plain text |

---

## Authentication

agentbin uses Ed25519 request signing. Each authenticated request includes:

- `X-AgentBin-PublicKey` - Base64-encoded public key
- `X-AgentBin-Timestamp` - Unix timestamp
- `X-AgentBin-Signature` - Base64-encoded Ed25519 signature

The CLI handles signing automatically using the configured private key.
