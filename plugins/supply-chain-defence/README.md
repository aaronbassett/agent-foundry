# Supply Chain Defence

Protect npm/pnpm/yarn projects from supply chain attacks through deterministic hook-based guards, project configuration hardening, and external security tool orchestration.

## What It Does

### Hooks (automatic, every session)

- **Session start:** Quick health check + deep async audit of dependencies
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

## Plugin Dependencies

Requires the `devs` plugin for `devs:deps-core` (package manager command reference).
