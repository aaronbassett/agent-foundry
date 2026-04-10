# Redaction Tiers

## Preset Tiers

| Preset | PII | Secrets | Abs Paths | Hook/System Noise | Tool Inputs | Tool Outputs | Code Blocks |
|--------|-----|---------|-----------|-------------------|-------------|--------------|-------------|
| `none` | keep | keep | keep | keep | keep | keep | keep |
| `light` | strip | strip | keep | keep | keep | keep | keep |
| `medium` | strip | strip | relativize | strip | keep | keep | keep |
| `heavy` | strip | strip | relativize | strip | names only | summary only | strip |
| `conversation-only` | strip | strip | strip | strip | strip | strip | strip |

## Individual Transforms

### PII

Strips personally identifiable information from all text content.

Patterns detected and replaced:

| Pattern | Replacement |
|---------|-------------|
| Email addresses | `[REDACTED-EMAIL]` |
| Phone numbers | `[REDACTED-PHONE]` |
| IP addresses (v4 and v6) | `[REDACTED-IP]` |
| Git user name (from config) | `[REDACTED-NAME]` |
| Git user email (from config) | `[REDACTED-EMAIL]` |

### Secrets

Strips credentials and secret material from all text content, including tool inputs and outputs.

Patterns detected and replaced:

| Pattern | Replacement |
|---------|-------------|
| OpenAI API keys (`sk-...`) | `[REDACTED-SECRET]` |
| GitHub tokens (`ghp_...`, `github_pat_...`) | `[REDACTED-SECRET]` |
| Bearer tokens in Authorization headers | `[REDACTED-SECRET]` |
| AWS access keys and secret keys | `[REDACTED-SECRET]` |
| `.env` file values (right-hand side of `KEY=value`) | `[REDACTED-SECRET]` |
| Connection strings (postgres://, mysql://, mongodb://, redis://) | `[REDACTED-SECRET]` |
| BIP-39 seed phrases (12/24-word mnemonic sequences) | `[REDACTED-SEED-PHRASE]` |
| Hex private keys (64-char hex strings in key contexts) | `[REDACTED-PRIVATE-KEY]` |

### Absolute Paths

Two modes:

- **relativize** — Replaces known roots with short aliases:
  - `projectRoot` → `./`
  - `homeDir` → `~/`
- **strip** — Replaces all absolute paths with `[REDACTED-PATH]`

### Hook/System Noise

Removes low-signal entries injected by the Claude Code harness. Specifically removes messages or content blocks whose type is:

- `attachment`
- `system`
- `permission-mode`

These entries appear frequently in raw JSONL and add noise without conversational value.

### Tool Inputs

Controls how tool call inputs are shown:

| Value | Behaviour |
|-------|-----------|
| `keep` | Input object preserved as-is |
| `names-only` | Input set to `null`; tool name is retained |
| `strip` | Entire tool call entry removed from the message |

### Tool Outputs

Controls how tool call results are shown:

| Value | Behaviour |
|-------|-----------|
| `keep` | Result text preserved as-is |
| `summary-only` | Result replaced with `[Tool output — summary needed]`. Claude fills in summaries during Step 7 processing. |
| `strip` | Result set to `null` |

### Code Blocks

Controls fenced code blocks (triple-backtick) in message text:

| Value | Behaviour |
|-------|-----------|
| `keep` | Code blocks preserved as-is |
| `strip` | Each fenced block replaced with `[code block removed]` |

## Toggle Options

After choosing a preset, individual transforms can be overridden. Each toggle is independent:

- `pii`: `keep` / `strip`
- `secrets`: `keep` / `strip`
- `paths`: `keep` / `relativize` / `strip`
- `hookNoise`: `keep` / `strip`
- `toolInputs`: `keep` / `names-only` / `strip`
- `toolOutputs`: `keep` / `summary-only` / `strip`
- `codeBlocks`: `keep` / `strip`

The resulting combination (preset + any overrides) is what gets passed to the redactor and saved to preferences.
