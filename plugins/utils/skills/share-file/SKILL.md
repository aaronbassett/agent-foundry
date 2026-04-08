---
name: utils:share-file
description: This skill should be used when the user asks to "share a file", "upload to agentbin", "publish an HTML page", "host a rendered page", "get a public URL for a file", "share output publicly", or when an agent needs to make an HTML, Markdown, YAML, JSON, TOML, or XML file accessible at a public URL for linking in GitHub PR comments, issues, or similar.
version: 0.1.0
---

# Sharing Files with agentbin

agentbin is a CLI tool for publishing rendered documents at public URLs. Upload HTML, Markdown, JSON, YAML, TOML, or XML files and receive a shareable link with rendered output, versioning, and collections.

---

## SECURITY NOTICE

**NEVER upload files containing secrets, API keys, tokens, passwords, private keys, credentials, `.env` files, or any sensitive configuration through agentbin.** Uploaded files are publicly accessible at the returned URL. Before uploading, verify the file contents do not contain private data. If the file was generated from a template or configuration, inspect it for interpolated secrets.

---

## Prerequisites

agentbin must be installed and configured before use. Check availability:

```sh
command -v agentbin
```

If not installed, install via Homebrew:

```sh
brew install aaronbassett/tap/agentbin
```

Or via Cargo:

```sh
cargo install agentbin
```

A key pair is required for authentication. Generate one if `~/.config/agentbin/key.pem` does not exist:

```sh
agentbin keygen
```

The server URL must be configured. Set via environment variable or the `--server-url` flag:

```sh
export AGENTBIN_SERVER_URL=https://agentbin.com
```

---

## Supported File Types

| Extension | Rendered As |
|-----------|-------------|
| `.html`, `.htm` | HTML (passthrough) |
| `.md`, `.markdown` | Rendered Markdown (GFM) |
| `.json` | Syntax-highlighted JSON |
| `.jsonc` | Syntax-highlighted JSONC |
| `.yaml`, `.yml` | Syntax-highlighted YAML |
| `.toml` | Syntax-highlighted TOML |
| `.xml` | Syntax-highlighted XML |
| `.rst` | reStructuredText |

File type is determined by extension. When uploading a temporary file, ensure it has the correct extension for proper rendering.

---

## Core Workflow: Upload a File

### Basic Upload

```sh
agentbin upload path/to/file.html --title "Descriptive Title"
```

The command returns a public URL like `https://agentbin.com/a1b2c3d4e5-descriptive-title`.

### Upload with Metadata

```sh
agentbin upload report.html \
  --title "PR Visual Diff Report" \
  --description "Before/after comparison for PR #42" \
  --tags review --tags visual-diff \
  --agent-model "claude-opus-4-6" \
  --agent-provider "anthropic" \
  --agent-tool "skill:share-file"
```

### Upload with JSON Output

For programmatic use, add `--json` to get structured output:

```sh
agentbin upload file.html --title "My Report" --json
```

### Upload a New Version

To update an existing upload, pass the UID:

```sh
agentbin upload updated-file.html --uid a1b2c3d4e5
```

### Set Expiry

Auto-expire uploads after a number of days:

```sh
agentbin upload file.html --title "Temp Report" --expiry 7
```

### Collections

Group related uploads into a named collection:

```sh
agentbin upload file.html --title "Sprint 12 Report" --collection "sprint-12"
```

---

## Typical Use Case: HTML for PR Comments

The primary use case is hosting a rendered HTML page and linking to it from a GitHub PR comment or issue.

### Step-by-step

1. Generate the HTML file (e.g., a visual diff, test report, design preview)
2. **Verify the file contains no secrets or private data**
3. Upload with a descriptive title:
   ```sh
   agentbin upload /tmp/visual-diff.html \
     --title "PR #42 Visual Diff" \
     --tags pr-review \
     --expiry 30
   ```
4. Use the returned URL in a PR comment:
   ```markdown
   ## Visual Diff Report
   [View the rendered report](https://agentbin.com/a1b2c3d4e5-pr-42-visual-diff)
   ```

### URL Formats

| URL Pattern | Description |
|-------------|-------------|
| `/{uid}` | Latest version (rendered) |
| `/{uid}/v{N}` | Specific version (rendered) |
| `/{uid}/raw` | Raw content of latest version |
| `/{uid}/v{N}/raw` | Raw content of specific version |
| `/c/{name}` | Collection overview with timeline |

---

## CLI Quick Reference

```
agentbin upload <FILE> [OPTIONS]

Options:
  --uid <UID>                  Upload as new version of existing UID
  --title <TITLE>              Title metadata (used in URL slug)
  --description <DESC>         Description metadata
  --tags <TAG>                 Tags (repeatable)
  --agent-model <MODEL>        Agent model name
  --agent-provider <PROVIDER>  Agent provider name
  --agent-tool <TOOL>          Agent tool name
  --trigger <TRIGGER>          Trigger context
  --meta <KEY=VALUE>           Custom metadata (repeatable)
  --collection <NAME>          Assign to a collection
  --expiry <DAYS>              Auto-expire after N days
  --json                       Output as JSON
  --server-url <URL>           Server URL [env: AGENTBIN_SERVER_URL]
  --key-file <PATH>            Ed25519 key path [env: AGENTBIN_KEY_FILE]
```

Other commands:

```sh
agentbin list                                  # List uploads
agentbin delete <UID> <VERSION>                # Delete a version
agentbin collection add <NAME> <UID>           # Add to collection
agentbin collection remove <NAME> <UID>        # Remove from collection
```

---

## Additional Resources

### Reference Files

For detailed CLI documentation and the full API reference, consult:
- **`references/cli-reference.md`** - Complete CLI options and environment variables
