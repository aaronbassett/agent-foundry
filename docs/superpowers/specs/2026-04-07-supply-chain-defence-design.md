# Supply Chain Defence Plugin — Design Spec

**Date:** 2026-04-07
**Plugin path:** `plugins/supply-chain-defence/`
**Branch:** `supply-chain-protection`

## Motivation

The npm ecosystem faces escalating supply chain attacks. The March 2026 Axios compromise (100M+ weekly downloads, North Korean state actor via maintainer credential theft) demonstrated that even the most trusted packages can be weaponized. In 2025 alone, 454,648 malicious npm packages were published. Attack vectors include account hijacking, typosquatting, dependency confusion, and lifecycle script exploitation.

This plugin hardens Claude Code sessions against these threats through deterministic script-based hooks, project configuration hardening, and orchestration of external security tools.

### Key references

- [Axios NPM Supply Chain Attack (March 2026)](https://cloud.google.com/blog/topics/threat-intelligence/north-korea-threat-actor-targets-axios-npm-package)
- [Microsoft Axios Compromise Mitigation](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/)
- [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)
- [npm Security Best Practices (Liran Tal)](https://github.com/lirantal/npm-security-best-practices)
- [Hardening npm, pnpm, and GitHub Actions (Spring 2026)](https://dev.to/trknhr/lessons-from-the-spring-2026-oss-incidents-hardening-npm-pnpm-and-github-actions-against-1jnp)

## Audience

**Primary:** Individual developers using Claude Code on their own projects.
**Future:** Teams and organisations (CI/CD guidance, org-wide policy enforcement).

## Design Principles

1. **Scripts over inference** — All hooks are deterministic Node.js scripts. No prompt-based hooks. Minimise inference to reduce the chance of missing something.
2. **Project-level enforcement** — Push as much as possible into project-level config (`.npmrc`, `package.json` scripts, lockfile-lint config) so protections apply to all developers, not just Claude users.
3. **Defence in depth** — Layer local checks (typosquatting) with external tools (Socket.dev). Neither alone is sufficient.
4. **Block then warn** — Most checks block the first time to force awareness, then warn on subsequent attempts within an 8-hour window. Hard rules (dependency direct-edit) always block.
5. **Detect and adapt** — Prefer pnpm for new projects. For existing projects, detect the package manager from lockfiles and use it consistently.
6. **Single source of truth** — All scripts live in `${CLAUDE_PLUGIN_DATA}/scripts/`. Only the SessionStart sync hook touches `${CLAUDE_PLUGIN_ROOT}`. Everything else reads from `${CLAUDE_PLUGIN_DATA}`.

## Package Manager Strategy

The plugin detects the active package manager from lockfiles following the same logic as `devs:deps-core`:

| Lock file | Package manager |
|---|---|
| `pnpm-lock.yaml` | pnpm |
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `bun.lockb` | bun |
| None | pnpm (default for new projects) |

All commands are mapped to the detected manager. The detected manager is cached in the state file.

---

## Plugin Structure

```
plugins/supply-chain-defence/
├── .claude-plugin/
│   ├── plugin.json
│   └── extends-plugin.json
├── README.md
├── hooks/
│   └── hooks.json
├── skills/
│   ├── setup/
│   │   └── SKILL.md
│   ├── harden/
│   │   └── SKILL.md
│   └── audit/
│       └── SKILL.md
├── commands/
│   ├── doctor.md
│   └── review.md
├── scripts/
│   ├── VERSION
│   ├── sync.sh
│   ├── runner.js
│   ├── config.json
│   ├── checks/
│   │   ├── npmrc-hardened.js
│   │   ├── lockfile-integrity.js
│   │   ├── lockfile-drift.js
│   │   ├── package-manager.js
│   │   ├── before-flag.js
│   │   ├── ci-over-install.js
│   │   ├── socket-present.js
│   │   ├── typosquat-local.js
│   │   ├── typosquat-bulk.js
│   │   ├── install-scripts.js
│   │   ├── dep-direct-edit.js
│   │   ├── npm-audit.js
│   │   ├── registry-metadata.js
│   │   ├── dependency-tree.js
│   │   ├── maintainer-history.js
│   │   ├── provenance-check.js
│   │   ├── npx-audit.js
│   │   ├── security-summary.js
│   │   ├── node-version.js
│   │   ├── socket-installed.js
│   │   ├── lockfile-lint-installed.js
│   │   ├── cyclonedx-installed.js
│   │   ├── jq-installed.js
│   │   ├── scripts-synced.js
│   │   ├── lockfile-present.js
│   │   ├── before-flag-config.js
│   │   ├── sbom-freshness.js
│   │   ├── socket-scan.js
│   │   ├── install-scripts-bulk.js
│   │   └── npmrc-changed.js
│   └── data/
│       └── popular-packages.json
```

### Dependencies

```json
{
  "dependencies": {
    "devs": {
      "version": "^0.7.0",
      "help": "Install devs plugin: provides dependency management commands used by supply-chain-defence"
    }
  }
}
```

Cross-references `devs:deps-core` for:
- Package manager detection logic
- Command equivalents across npm/yarn/pnpm/bun (install, ci, audit, etc.)
- Security audit command execution

---

## Script Architecture

### Script Sync (`sync.sh`)

Runs on `SessionStart` (matcher: `startup` only). The **only** script that uses `${CLAUDE_PLUGIN_ROOT}`.

1. Compare `${CLAUDE_PLUGIN_ROOT}/scripts/VERSION` with `${CLAUDE_PLUGIN_DATA}/scripts/VERSION`
2. If mismatch or missing: copy entire `${CLAUDE_PLUGIN_ROOT}/scripts/` to `${CLAUDE_PLUGIN_DATA}/scripts/`
3. All other hooks, skills, and commands reference `${CLAUDE_PLUGIN_DATA}/scripts/`

### Runner (`runner.js`)

Central orchestrator. All hooks and commands call it with `--profile <name>`.

**Flow:**
1. Parse `--profile <name>` from args
2. Load `config.json`, resolve check list for the profile
3. Read hook input from stdin (JSON), extract `cwd`
4. Read state file from `path.join(cwd, '.claude/agent-foundry/supply-chain-defence.local.json')`
5. Run each check in the profile, passing `{ input, state, config, cwd }`
6. For `block-then-warn` checks: consult state file timestamps, decide block vs warn
7. Aggregate results
8. Output appropriate JSON for the hook event type
9. Update state file if a new block was recorded

**All file operations use `cwd` from hook input JSON. Never assume `process.cwd()` is correct.**

### Check Module Interface

Each check exports a single function:

```javascript
module.exports = async function(input, state, config, cwd) {
  return {
    status: 'pass' | 'warn' | 'block' | 'info',
    message: 'Human-readable description',
    details: { /* check-specific data */ }
  };
};
```

### Config (`config.json`)

```json
{
  "profiles": {
    "quick": [
      "npmrc-hardened", "socket-present", "package-manager",
      "lockfile-present", "typosquat-bulk"
    ],
    "deep": [
      "npm-audit", "lockfile-integrity", "socket-scan",
      "install-scripts-bulk", "before-flag-config", "sbom-freshness"
    ],
    "bash-guard": [
      "ci-over-install", "before-flag", "typosquat-local",
      "socket-present", "install-scripts"
    ],
    "edit-guard": ["dep-direct-edit"],
    "write-guard": ["dep-direct-edit"],
    "post-install-audit": ["lockfile-integrity", "lockfile-drift"],
    "file-changed": ["lockfile-drift", "npmrc-changed"],
    "doctor": [
      "node-version", "pm-detected", "socket-installed",
      "lockfile-lint-installed", "cyclonedx-installed",
      "jq-installed", "scripts-synced"
    ],
    "review": [
      "registry-metadata", "dependency-tree", "maintainer-history",
      "typosquat-local", "socket-scan", "install-scripts",
      "provenance-check"
    ],
    "npx-post-audit": ["typosquat-local", "npx-audit"],
    "pre-compact": ["security-summary"],
    "subagent-context": ["security-summary"]
  },
  "severity": {
    "dep-direct-edit": "always-block",
    "ci-over-install": "block-then-warn",
    "before-flag": "block-then-warn",
    "typosquat-local": "block-then-warn",
    "typosquat-bulk": "report",
    "socket-present": "block-then-warn",
    "install-scripts": "block-then-warn",
    "npmrc-hardened": "report",
    "lockfile-integrity": "report",
    "lockfile-drift": "report",
    "npm-audit": "report",
    "lockfile-present": "report",
    "package-manager": "report"
  },
  "thresholds": {
    "typosquatMaxDistance": 2,
    "beforeFlagDays": 5,
    "blockThenWarnTTLHours": 8
  }
}
```

**Severity levels:**
- `always-block` — hard block, no override, no TTL
- `block-then-warn` — block first time, warn within 8-hour TTL window
- `report` — informational, included in output but never blocks

### State File

Located at `<cwd>/.claude/agent-foundry/supply-chain-defence.local.json`. Created by the plugin, gitignored.

```json
{
  "detectedPackageManager": "pnpm",
  "lastDeepAudit": 1712505600,
  "blocked": {
    "typosquat": { "axois": 1712505600 },
    "lifecycleScripts": { "evil-pkg": 1712505600 },
    "ciOverInstall": { "_": 1712505600 },
    "beforeFlag": { "pnpm add lodash": 1712505600 },
    "socketMissing": { "_": 1712505600 }
  }
}
```

### Typosquatting Data (`popular-packages.json`)

Static list of top 2000-3000 npm packages by weekly downloads. Shipped with the plugin, updated periodically. Levenshtein distance check (max distance 2) runs against this list. No network required.

---

## Hooks

All hooks use `type: "command"`. No prompt-based hooks. Only `sync.sh` uses `${CLAUDE_PLUGIN_ROOT}`; all others use `${CLAUDE_PLUGIN_DATA}`.

### SessionStart: Script Sync

```json
{
  "matcher": "startup",
  "hooks": [{
    "type": "command",
    "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/sync.sh",
    "timeout": 10
  }]
}
```

Copies scripts from plugin root to persistent data directory if VERSION mismatch.

### SessionStart: Quick Health Check (sync)

```json
{
  "matcher": "startup|resume|clear",
  "hooks": [{
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile quick",
    "timeout": 30,
    "statusMessage": "Supply chain health check"
  }]
}
```

Runs on every session entry. Quick checks: `.npmrc` hardened, Socket installed, package manager detected, lockfile present, typosquat scan of all package names in package.json/lockfile.

Returns `additionalContext` for Claude. Returns `systemMessage` for critical issues (missing `.npmrc`, typosquat hit in existing dependencies).

### SessionStart: Deep Audit (async)

```json
{
  "matcher": "startup",
  "hooks": [{
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile deep",
    "async": true,
    "timeout": 300,
    "statusMessage": "Deep supply chain audit"
  }]
}
```

Background-only, fresh sessions only. Full `npm audit`/`pnpm audit`, `lockfile-lint`, Socket scan, lifecycle script detection, `--before`/`min-release-age` config check, SBOM freshness. Results delivered via `systemMessage` on next turn.

### PreToolUse: Bash — Package Manager Interception

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(npm *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile bash-guard",
      "timeout": 30
    },
    {
      "type": "command",
      "if": "Bash(pnpm *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile bash-guard",
      "timeout": 30
    },
    {
      "type": "command",
      "if": "Bash(yarn *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile bash-guard",
      "timeout": 30
    },
    {
      "type": "command",
      "if": "Bash(npx *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile bash-guard",
      "timeout": 30
    }
  ]
}
```

**Checks (all block-then-warn):**

| Check | Trigger | Behaviour |
|---|---|---|
| `ci-over-install` | `npm install` / `pnpm install` without adding a package | Block, recommend `npm ci` / `pnpm install --frozen-lockfile` |
| `before-flag` | `npm install <pkg>` / `pnpm add <pkg>` (adding new deps) | Block, inject `--before` flag with 5-day offset. Complements `min-release-age` in `.npmrc` — the hook enforces the policy even before `.npmrc` is hardened |
| `typosquat-local` | Any package name being installed | Block if Levenshtein distance ≤2 from a top-N package |
| `socket-present` | Any install/add command | Block if Socket wrapper isn't active |
| `install-scripts` | Any install/add command | Block if target package has lifecycle scripts |

Uses `hookSpecificOutput.permissionDecision: "deny"` with `permissionDecisionReason` explaining what to do and that we won't block again within 8 hours.

### PreToolUse: Edit — Dependency Direct-Edit Block

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "if": "Edit(**/package.json)",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile edit-guard",
    "timeout": 5
  }]
}
```

**Always blocks** if `old_string`/`new_string` touches `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`, or `overrides`. No block-then-warn. Allows edits to `scripts`, `name`, `description`, etc.

### PreToolUse: Write — package.json Full-Write Block

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "if": "Write(**/package.json)",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile write-guard",
    "timeout": 5
  }]
}
```

**Always blocks** if the write would change dependency fields compared to the current file on disk.

### PostToolUse: Post-Install Audit (async)

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(npm *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile post-install-audit",
      "async": true,
      "timeout": 180
    },
    {
      "type": "command",
      "if": "Bash(pnpm *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile post-install-audit",
      "async": true,
      "timeout": 180
    },
    {
      "type": "command",
      "if": "Bash(yarn *)",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile post-install-audit",
      "async": true,
      "timeout": 180
    }
  ]
}
```

After any npm/pnpm/yarn command, checks lockfile drift (`git diff`), runs `lockfile-lint`, flags new transitive deps. Reports via `systemMessage`.

### PostToolUse: npx Audit (async)

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "if": "Bash(npx *)",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile npx-post-audit",
    "async": true,
    "timeout": 60
  }]
}
```

`npx` auto-installs packages, bypassing install guards. After execution, logs what was run and flags suspicious packages via `systemMessage`. Uses a dedicated `npx-post-audit` profile (not `bash-guard`) since this is post-execution analysis, not pre-execution gating.

### FileChanged: Watch Lockfiles and .npmrc

```json
{
  "matcher": "package-lock.json|pnpm-lock.yaml|yarn.lock|.npmrc",
  "hooks": [{
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile file-changed",
    "timeout": 10
  }]
}
```

Detects modifications outside of a package manager command. Logs `systemMessage` warning.

### PreCompact: Preserve Security Context

```json
{
  "matcher": "auto|manual",
  "hooks": [{
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile pre-compact",
    "timeout": 5
  }]
}
```

Injects summary of all security warnings/blocks from the session into `additionalContext` so they survive compaction.

### SubagentStart: Inherit Security Context

```json
{
  "matcher": "*",
  "hooks": [{
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile subagent-context",
    "timeout": 5
  }]
}
```

Injects current project security posture (detected PM, block state, key warnings) into subagent via `additionalContext`.

---

## Skills

### `supply-chain-defence:setup`

Remediation skill. Called by doctor or standalone. Handles:

- Install and configure Socket CLI (socket wrapper)
- Install `lockfile-lint` and generate `.lockfile-lintrc`
- Create/update `.npmrc` with hardened settings
- Add `preinstall` script to `package.json`
- Add security-related npm scripts (`audit`, `lockfile-lint`)
- Create `.claude/agent-foundry/supply-chain-defence.local.json` with defaults
- Set up LavaMoat (optional, guided)
- Add relevant entries to `.gitignore`
- Optionally install `@cyclonedx/cyclonedx-npm` for SBOM generation

All operations use the detected package manager. Uses pnpm for new projects.

### `supply-chain-defence:harden`

Configuration hardening. Generates or updates config files only (does not install tools):

- `.npmrc`:
  ```ini
  ignore-scripts=true
  package-lock=true
  registry=https://registry.npmjs.org/
  strict-ssl=true
  audit-level=low
  npx-auto-install=false
  save-exact=true
  min-release-age=5
  ```
- `.lockfile-lintrc` configuration
- `package.json` scripts section (`preinstall`, `audit`)
- CI workflow snippets (GitHub Actions security job)

### `supply-chain-defence:audit`

Full security posture report:

- `npm audit` / `pnpm audit` (defers to `devs:deps-core` for commands)
- `lockfile-lint` validation
- Socket scan (if available)
- npmscan.com lookup for top-level deps
- Dependency age analysis (flag anything published in the last 5 days)
- Maintainer analysis (flag single-maintainer packages with high download counts)
- Optionally offers SBOM generation via `@cyclonedx/cyclonedx-npm`

---

## Commands

### `/supply-chain-defence:doctor`

Diagnoses whether the plugin's toolchain is ready. Focused on **tool availability**, not project configuration.

Accepts `--auto-fix` flag.

**Checks:**
- Node.js installed and version adequate
- Package manager detected (npm/pnpm/yarn)
- Socket CLI installed and authenticated
- `lockfile-lint` installed
- `@cyclonedx/cyclonedx-npm` installed (optional, noted if missing)
- `jq` available
- `${CLAUDE_PLUGIN_DATA}/scripts/` exists and VERSION matches

**Flow:**
1. Run `runner.js --profile doctor`
2. Present results as categorised report (ready / missing / optional)
3. Without `--auto-fix`: ask user which issues to fix, then invoke `setup` skill
4. With `--auto-fix`: invoke `setup` skill for all fixable issues automatically

### `/supply-chain-defence:review`

Deep dive on a specific package, project, or lockfile.

**Accepts:**
- A package name: `lodash`, `@scope/pkg`
- A file path: `./package.json`, `./pnpm-lock.yaml`
- A directory: `./packages/api/`

**For a package name:**
1. Registry metadata — publish dates, version count, maintainer history
2. Download trend analysis — sudden spikes or drops
3. Provenance check — npm provenance attestation
4. Socket analysis — risk score, capabilities
5. npmscan.com lookup
6. Dependency tree — transitive deps
7. Lifecycle scripts — `preinstall`/`postinstall`
8. Source repo check — published code matches repo

**For a directory/file:**
1. All of the above for every direct dependency
2. Lockfile integrity via `lockfile-lint`
3. Dependency age analysis
4. Flag any dependency without provenance
5. Aggregate risk summary

---

## Scope

### In scope

- Preventing Claude from running unsafe npm/pnpm/yarn commands (hooks)
- Preventing Claude from directly editing dependency fields in package.json (hooks)
- Session-start security context — quick sync + deep async (hooks)
- Preserving security context across compaction and subagents (hooks)
- Watching for unexpected lockfile/.npmrc changes (hooks)
- Diagnosing tooling prerequisites (`/doctor`)
- Fixing tooling setup (`setup` skill)
- Hardening project config files (`harden` skill)
- Full security posture reports (`audit` skill)
- Deep dives on individual packages or projects (`/review`)
- SBOM generation as optional extra

### Out of scope

- Runtime sandboxing (LavaMoat's job — we help set it up)
- CI/CD enforcement (we generate config snippets, CI owns execution)
- Package publishing security
- Non-npm ecosystems (future expansion)
- Replacing Socket.dev or npm audit (we orchestrate them)

### External tools

| Tool | Purpose | Required? |
|---|---|---|
| [Socket.dev CLI](https://github.com/SocketDev/socket-cli) | Package risk analysis, typosquatting detection, malware scanning | Yes |
| [lockfile-lint](https://github.com/lirantal/lockfile-lint) | Lockfile integrity validation | Yes |
| [LavaMoat](https://github.com/LavaMoat/LavaMoat) | Runtime dependency sandboxing | Optional (guided setup) |
| [@cyclonedx/cyclonedx-npm](https://github.com/CycloneDX/cyclonedx-node-npm) | SBOM generation | Optional |
| [npmscan.com](https://npmscan.com) | Malicious package detection | Used via API in review/audit |
