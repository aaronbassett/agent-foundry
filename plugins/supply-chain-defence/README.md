# Supply Chain Defence

Protect npm/pnpm/yarn projects from supply chain attacks through deterministic hook-based guards, project configuration hardening, and external security tool orchestration.

## What It Does

### Hooks (automatic, every session)

- **Session start:** Quick health check + deep async audit of dependencies
- **Hard-block of network installers:** Refuses `npx`, `npm install` / `npm add`, `pnpm install` / `pnpm dlx`, `yarn add` / `yarn dlx`, `bun add` / `bun x`, `pip install`, `pipx`, `uv pip install` / `uvx`, `brew install`, `gem install`, `go install`, and pipe-to-shell installers (`curl … | sh`, `wget … | bash`). These bypass lockfile and release-age gates by pulling arbitrary code straight from a network registry. There is no TTL override — every invocation is refused.
- **Install interception:** Enforces `ci` over `install`, `--before` flag for new packages, typosquatting detection, Socket.dev presence, lifecycle script warnings
- **Dependency edit block:** Prevents Claude from directly editing dependency fields in `package.json` — forces use of the package manager
- **Lockfile monitoring:** Watches for unexpected changes to lockfiles and `.npmrc`
- **Context preservation:** Carries security warnings across context compaction and into subagents

### Skills

- **`supply-chain-defence:setup`** — Install and configure required security tools
- **`supply-chain-defence:harden`** — Generate hardened `.npmrc`, lockfile-lint config, preinstall scripts, CI workflows
- **`supply-chain-defence:audit`** — Full security posture report (npm audit, lockfile-lint, Socket scan, dependency age analysis)

### Commands

- **`/supply-chain-defence:doctor`** — Check if all required tools are installed. Use `--auto-fix` to install missing tools automatically.
- **`/supply-chain-defence:review <target>`** — Deep dive on a package name, directory, or lockfile.

### MCP Integrations (optional, advisory)

- **npmscan** (`https://npmscan.com/api/mcp`) — public, no-auth MCP server providing malware/OSV.dev vulnerability signal beyond what `npm view`/`npm audit` expose. Registered in `.mcp.json`; used by `/supply-chain-defence:review` and `supply-chain-defence:audit` when connected. This is a live call to a third-party service (rate-limited to 30 req/min) — it enriches the LLM-driven review/audit flows, not the deterministic `runner.js` hook checks, and both skills degrade gracefully if it isn't connected.

## Required Tools

| Tool | Install |
|------|---------|
| [Socket.dev CLI](https://socket.dev) | `npm install -g @socketsecurity/cli` |
| [lockfile-lint](https://github.com/lirantal/lockfile-lint) | `npm install -g lockfile-lint` |

## Optional Tools

| Tool | Install | Purpose |
|------|---------|---------|
| [LavaMoat](https://github.com/LavaMoat/LavaMoat) | `pnpm add -D @lavamoat/allow-scripts` | Runtime dependency sandboxing |
| [CycloneDX](https://github.com/CycloneDX/cyclonedx-node-npm) | `npm install -g @cyclonedx/cyclonedx-npm` | SBOM generation |

## Quick Start

1. Install the plugin
2. Run `/supply-chain-defence:doctor --auto-fix` to install required tools
3. Run `/supply-chain-defence:harden` to configure your project
4. Restart Claude Code — hooks activate automatically

## Package Manager Support

Prefers **pnpm** for new projects. Detects and adapts to existing projects using npm, yarn, or bun.

## How It Works

### Two enforcement tiers

- **Always-block (no TTL):** the `installer-block` check refuses every `npx`, `npm install`, `pnpm dlx`, `pip install`, `brew install`, pipe-to-shell, etc. invocation. The `dep-direct-edit` check similarly always-blocks direct edits to dependency fields in `package.json`. Neither has an override — you must take a different route (vetted lockfile update, cargo equivalent, container image, etc.).
- **Block-then-warn (8-hour TTL):** typosquatting, Socket presence, `ci`-over-`install`, `--before` flag, lifecycle scripts. These **block the first time** to force awareness, then **warn on subsequent attempts** within an 8-hour window — preventing alert fatigue while ensuring every issue is seen at least once.

State is tracked per-project in `.claude/agent-foundry/supply-chain-defence.local.json`.

### Script Architecture

All hooks are deterministic Node.js scripts — no prompt-based hooks. A central `runner.js` loads check profiles from `config.json` and executes modular check scripts from `scripts/checks/`. Scripts ship in the plugin and sync to `${CLAUDE_PLUGIN_DATA}` at session start.

## Testing

Run the test suite with Node's built-in test runner:

```bash
node --test plugins/supply-chain-defence/tests/*.test.js
```

238 tests covering all check scripts and runner internals (severity logic, output formatting, state management).

## Plugin Dependencies

Requires the `devs` plugin for `devs:deps-core` (package manager command reference).
