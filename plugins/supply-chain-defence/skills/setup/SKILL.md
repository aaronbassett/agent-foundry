---
name: supply-chain-defence:setup
description: >-
  This skill should be used when the user asks to "set up supply chain protection",
  "install security tools", "configure Socket", "install lockfile-lint",
  "set up supply chain defence", "fix supply chain issues", or when invoked by
  the doctor command to remediate missing tools. Handles installation and
  configuration of Socket.dev CLI, lockfile-lint, LavaMoat (optional),
  CycloneDX (optional), and project state file initialisation.
---

# Supply Chain Defence Setup

Install and configure the tools required by the supply-chain-defence plugin.

## Prerequisites

- Node.js 18+ installed
- A package manager (pnpm preferred, npm/yarn supported)

## Detect Package Manager

Check for lockfiles in the project root to determine the active package manager:

| Lock file | Package manager | Install command |
|---|---|---|
| `pnpm-lock.yaml` | pnpm | `pnpm add -g` |
| `package-lock.json` | npm | `npm install -g` |
| `yarn.lock` | yarn | `yarn global add` |
| None | pnpm (default) | `pnpm add -g` |

## Setup Steps

### 1. Socket.dev CLI

Check if `socket` is available:

```bash
socket --version
```

If not installed:

```bash
npm install -g @socketsecurity/cli
```

After installation, verify the wrapper is active:

```bash
socket --version
```

Note: Socket.dev requires an API key for full functionality. Guide the user to https://socket.dev to create an account and configure their key.

### 2. lockfile-lint

Check if available:

```bash
npx lockfile-lint --version
```

If not installed:

```bash
npm install -g lockfile-lint
```

### 3. State File

Create `.claude/agent-foundry/supply-chain-defence.local.json` if it doesn't exist. Read `${CLAUDE_SKILL_DIR}/examples/supply-chain-defence.local.json` for the expected structure. The initial state should be:

```json
{
  "detectedPackageManager": "<detected-pm>",
  "lastDeepAudit": null,
  "blocked": {}
}
```

Ensure `.claude/agent-foundry/` is in `.gitignore`.

### 4. LavaMoat (Optional)

Ask the user if they want to set up LavaMoat for runtime dependency sandboxing. If yes:

```bash
pnpm add -D @lavamoat/allow-scripts
```

Then configure `@lavamoat/allow-scripts` in `package.json` to control which packages can run lifecycle scripts.

### 5. CycloneDX (Optional)

Ask the user if they want SBOM generation capability. If yes:

```bash
npm install -g @cyclonedx/cyclonedx-npm
```

### 6. Gitignore Entries

Ensure these entries exist in `.gitignore`:

```
.claude/agent-foundry/
.claude/*.local.md
.claude/*.local.json
```

## After Setup

Remind the user to:
1. Run `/supply-chain-defence:harden` to configure `.npmrc` and project scripts
2. Restart Claude Code for hooks to activate with the new tools
