# Supply Chain Defence Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin that protects npm/pnpm/yarn projects from supply chain attacks through deterministic Node.js hook scripts, project configuration hardening, and external security tool orchestration.

**Architecture:** Script-heavy plugin. A central `runner.js` orchestrates modular check scripts (`checks/*.js`). All hooks are `type: "command"` calling Node.js — no prompt-based hooks. Scripts ship in `${CLAUDE_PLUGIN_ROOT}/scripts/` and sync to `${CLAUDE_PLUGIN_DATA}/scripts/` at session start. Block-then-warn state tracked in a per-project JSON file.

**Tech Stack:** Node.js (scripts), Bash (sync.sh), JSON (config, state), Markdown (skills, commands, hooks.json)

**Spec:** `docs/superpowers/specs/2026-04-07-supply-chain-defence-design.md`

---

## Phase 1: Plugin Scaffold & Core Infrastructure

### Task 1: Plugin Scaffold

**Files:**
- Create: `plugins/supply-chain-defence/.claude-plugin/plugin.json`
- Create: `plugins/supply-chain-defence/.claude-plugin/extends-plugin.json`

- [ ] **Step 1: Create plugin directory structure**

```bash
mkdir -p plugins/supply-chain-defence/.claude-plugin
mkdir -p plugins/supply-chain-defence/hooks
mkdir -p plugins/supply-chain-defence/skills/setup
mkdir -p plugins/supply-chain-defence/skills/harden
mkdir -p plugins/supply-chain-defence/skills/audit
mkdir -p plugins/supply-chain-defence/commands
mkdir -p plugins/supply-chain-defence/scripts/checks
mkdir -p plugins/supply-chain-defence/scripts/data
```

- [ ] **Step 2: Write plugin.json**

Write to `plugins/supply-chain-defence/.claude-plugin/plugin.json`:

```json
{
  "name": "supply-chain-defence",
  "version": "0.1.0",
  "description": "Protect npm/pnpm/yarn projects from supply chain attacks. Deterministic hook-based guards for typosquatting, dependency confusion, lifecycle script exploitation, and lockfile tampering. Orchestrates Socket.dev, lockfile-lint, and npm audit.",
  "author": {
    "name": "Aaron Bassett",
    "email": "aaronbassett@gmail.com",
    "url": "https://aaronbassett.com"
  },
  "homepage": "https://github.com/aaronbassett/agent-foundry",
  "repository": "https://github.com/aaronbassett/agent-foundry/tree/main/plugins/supply-chain-defence",
  "license": "MIT",
  "keywords": [
    "security",
    "supply-chain",
    "npm",
    "pnpm",
    "typosquatting",
    "lockfile",
    "socket-dev",
    "hooks"
  ]
}
```

- [ ] **Step 3: Write extends-plugin.json**

Write to `plugins/supply-chain-defence/.claude-plugin/extends-plugin.json`:

```json
{
  "dependencies": {
    "devs": {
      "version": "^0.7.0",
      "help": "Required for dependency management commands (devs:deps-core).\n\nInstall from agent-foundry:\n/plugin marketplace add aaronbassett/agent-foundry\n/plugin install devs@agent-foundry"
    }
  },
  "optionalDependencies": {},
  "systemDependencies": {},
  "optionalSystemDependencies": {}
}
```

- [ ] **Step 4: Verify JSON files are valid**

Run: `cat plugins/supply-chain-defence/.claude-plugin/plugin.json | python3 -m json.tool > /dev/null && cat plugins/supply-chain-defence/.claude-plugin/extends-plugin.json | python3 -m json.tool > /dev/null && echo "Both valid"`
Expected: `Both valid`

- [ ] **Step 5: Commit**

```bash
git add plugins/supply-chain-defence/.claude-plugin/
git commit -m "feat(supply-chain-defence): scaffold plugin with metadata and dependencies"
```

---

### Task 2: VERSION File and Sync Script

**Files:**
- Create: `plugins/supply-chain-defence/scripts/VERSION`
- Create: `plugins/supply-chain-defence/scripts/sync.sh`

- [ ] **Step 1: Write VERSION file**

Write to `plugins/supply-chain-defence/scripts/VERSION`:

```
0.1.0
```

- [ ] **Step 2: Write sync.sh**

Write to `plugins/supply-chain-defence/scripts/sync.sh`:

```bash
#!/bin/bash
set -euo pipefail

# sync.sh — The ONLY script that uses CLAUDE_PLUGIN_ROOT.
# Copies scripts/ from plugin root to CLAUDE_PLUGIN_DATA if version mismatch.

SOURCE_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
TARGET_DIR="${CLAUDE_PLUGIN_DATA}/scripts"

# Read source version
if [[ ! -f "${SOURCE_DIR}/VERSION" ]]; then
  echo "ERROR: ${SOURCE_DIR}/VERSION not found" >&2
  exit 0  # Non-blocking — don't break session start
fi
SOURCE_VERSION=$(cat "${SOURCE_DIR}/VERSION")

# Read target version (may not exist yet)
TARGET_VERSION=""
if [[ -f "${TARGET_DIR}/VERSION" ]]; then
  TARGET_VERSION=$(cat "${TARGET_DIR}/VERSION")
fi

# Compare and sync if needed
if [[ "${SOURCE_VERSION}" != "${TARGET_VERSION}" ]]; then
  mkdir -p "${TARGET_DIR}"
  # Remove old scripts to avoid stale files
  rm -rf "${TARGET_DIR:?}/"*
  cp -R "${SOURCE_DIR}/"* "${TARGET_DIR}/"
fi

exit 0
```

- [ ] **Step 3: Make sync.sh executable**

Run: `chmod +x plugins/supply-chain-defence/scripts/sync.sh`

- [ ] **Step 4: Test sync.sh locally (dry run)**

Run: `bash -n plugins/supply-chain-defence/scripts/sync.sh && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 5: Commit**

```bash
git add plugins/supply-chain-defence/scripts/VERSION plugins/supply-chain-defence/scripts/sync.sh
git commit -m "feat(supply-chain-defence): add VERSION file and sync.sh for script distribution"
```

---

### Task 3: Config File

**Files:**
- Create: `plugins/supply-chain-defence/scripts/config.json`

- [ ] **Step 1: Write config.json**

Write to `plugins/supply-chain-defence/scripts/config.json`:

```json
{
  "profiles": {
    "quick": [
      "npmrc-hardened",
      "socket-present",
      "package-manager",
      "lockfile-present",
      "typosquat-bulk"
    ],
    "deep": [
      "npm-audit",
      "lockfile-integrity",
      "socket-scan",
      "install-scripts-bulk",
      "before-flag-config",
      "sbom-freshness"
    ],
    "bash-guard": [
      "ci-over-install",
      "before-flag",
      "typosquat-local",
      "socket-present",
      "install-scripts"
    ],
    "edit-guard": [
      "dep-direct-edit"
    ],
    "write-guard": [
      "dep-direct-edit"
    ],
    "post-install-audit": [
      "lockfile-integrity",
      "lockfile-drift"
    ],
    "npx-post-audit": [
      "typosquat-local",
      "npx-audit"
    ],
    "file-changed": [
      "lockfile-drift",
      "npmrc-changed"
    ],
    "doctor": [
      "node-version",
      "pm-detected",
      "socket-installed",
      "lockfile-lint-installed",
      "cyclonedx-installed",
      "jq-installed",
      "scripts-synced"
    ],
    "review": [
      "registry-metadata",
      "dependency-tree",
      "maintainer-history",
      "typosquat-local",
      "socket-scan",
      "install-scripts",
      "provenance-check"
    ],
    "pre-compact": [
      "security-summary"
    ],
    "subagent-context": [
      "security-summary"
    ]
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

- [ ] **Step 2: Verify JSON is valid**

Run: `cat plugins/supply-chain-defence/scripts/config.json | python3 -m json.tool > /dev/null && echo "Valid"`
Expected: `Valid`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/config.json
git commit -m "feat(supply-chain-defence): add check profiles and severity config"
```

---

### Task 4: Runner Script

**Files:**
- Create: `plugins/supply-chain-defence/scripts/runner.js`

- [ ] **Step 1: Write runner.js**

Write to `plugins/supply-chain-defence/scripts/runner.js`:

```javascript
#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = __dirname;
const CONFIG_PATH = path.join(SCRIPT_DIR, "config.json");
const STATE_FILENAME = ".claude/agent-foundry/supply-chain-defence.local.json";

// --- Argument parsing ---

function parseArgs(argv) {
  const args = { profile: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--profile" && argv[i + 1]) {
      args.profile = argv[i + 1];
      i++;
    }
  }
  return args;
}

// --- Stdin reading ---

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // If stdin is not piped (e.g. running manually), resolve empty after timeout
    setTimeout(() => resolve({}), 100);
  });
}

// --- State file ---

function readState(cwd) {
  const statePath = path.join(cwd, STATE_FILENAME);
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { detectedPackageManager: null, lastDeepAudit: null, blocked: {} };
  }
}

function writeState(cwd, state) {
  const statePath = path.join(cwd, STATE_FILENAME);
  const stateDir = path.dirname(statePath);
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

// --- Severity logic ---

function shouldBlock(checkName, checkKey, state, config) {
  const severity = config.severity[checkName];
  if (!severity) return false;
  if (severity === "always-block") return true;
  if (severity === "report") return false;

  if (severity === "block-then-warn") {
    const ttlMs = (config.thresholds.blockThenWarnTTLHours || 8) * 3600 * 1000;
    const category = state.blocked || {};
    const entries = category[checkName] || {};
    const key = checkKey || "_";
    const lastBlocked = entries[key];
    if (lastBlocked && Date.now() - lastBlocked < ttlMs) {
      return false; // Within TTL — warn instead
    }
    return true; // First time or TTL expired — block
  }

  return false;
}

function recordBlock(checkName, checkKey, state) {
  if (!state.blocked) state.blocked = {};
  if (!state.blocked[checkName]) state.blocked[checkName] = {};
  state.blocked[checkName][checkKey || "_"] = Date.now();
}

// --- Check loading and execution ---

async function runCheck(checkName, input, state, config, cwd) {
  const checkPath = path.join(SCRIPT_DIR, "checks", `${checkName}.js`);
  if (!fs.existsSync(checkPath)) {
    return {
      status: "info",
      message: `Check "${checkName}" not found at ${checkPath}`,
      details: {},
    };
  }
  try {
    const check = require(checkPath);
    return await check(input, state, config, cwd);
  } catch (err) {
    return {
      status: "info",
      message: `Check "${checkName}" threw: ${err.message}`,
      details: { error: err.message },
    };
  }
}

// --- Output formatting ---

function formatPreToolUseOutput(results, state, config) {
  // Find the first blocking result
  for (const r of results) {
    if (r.status !== "block") continue;

    const isBlocked = shouldBlock(r.checkName, r.checkKey, state, config);
    if (isBlocked) {
      recordBlock(r.checkName, r.checkKey, state);
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            r.message +
            "\n\nThis check will not block again for the next " +
            config.thresholds.blockThenWarnTTLHours +
            " hours.",
        },
      };
    }
  }

  // Collect warnings
  const warnings = results.filter(
    (r) => r.status === "warn" || r.status === "block"
  );
  if (warnings.length > 0) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        additionalContext:
          "Supply chain warnings (previously blocked, now allowed):\n" +
          warnings.map((w) => `- ${w.message}`).join("\n"),
      },
    };
  }

  // All passed
  return null;
}

function formatAlwaysBlockOutput(results) {
  for (const r of results) {
    if (r.status === "block") {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: r.message,
        },
      };
    }
  }
  return null;
}

function formatSessionStartOutput(results) {
  const critical = results.filter(
    (r) => r.status === "block" || r.status === "warn"
  );
  const info = results.filter(
    (r) => r.status === "pass" || r.status === "info"
  );

  const contextLines = results.map(
    (r) => `[${r.status.toUpperCase()}] ${r.message}`
  );

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        "Supply chain defence status:\n" + contextLines.join("\n"),
    },
  };

  if (critical.length > 0) {
    output.systemMessage =
      "Supply chain issues detected:\n" +
      critical.map((c) => `- ${c.message}`).join("\n");
  }

  return output;
}

function formatAsyncOutput(results) {
  const issues = results.filter(
    (r) => r.status === "warn" || r.status === "block"
  );
  if (issues.length === 0) return null;

  return {
    systemMessage:
      "Supply chain audit findings:\n" +
      issues.map((i) => `- [${i.status.toUpperCase()}] ${i.message}`).join("\n"),
  };
}

function formatContextOutput(results) {
  const lines = results
    .filter((r) => r.message)
    .map((r) => r.message);
  if (lines.length === 0) return null;

  return {
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: lines.join("\n"),
    },
  };
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv);
  if (!args.profile) {
    console.error("Usage: runner.js --profile <profile-name>");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const profile = config.profiles[args.profile];
  if (!profile) {
    console.error(`Unknown profile: ${args.profile}`);
    process.exit(1);
  }

  const input = await readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);
  const hookEvent = input.hook_event_name || "";

  // Run all checks in the profile
  const results = [];
  for (const checkName of profile) {
    const result = await runCheck(checkName, input, state, config, cwd);
    result.checkName = checkName;
    result.checkKey = result.details?.key || null;
    results.push(result);
  }

  // Format output based on hook event and profile
  let output = null;

  if (args.profile === "edit-guard" || args.profile === "write-guard") {
    // Always-block profiles
    output = formatAlwaysBlockOutput(results);
  } else if (args.profile === "bash-guard") {
    output = formatPreToolUseOutput(results, state, config);
  } else if (args.profile === "quick") {
    output = formatSessionStartOutput(results);
  } else if (
    args.profile === "deep" ||
    args.profile === "post-install-audit" ||
    args.profile === "npx-post-audit" ||
    args.profile === "file-changed"
  ) {
    output = formatAsyncOutput(results);
  } else if (
    args.profile === "pre-compact" ||
    args.profile === "subagent-context"
  ) {
    output = formatContextOutput(results);
  } else if (args.profile === "doctor" || args.profile === "review") {
    // Doctor and review output all results for the skill/command to format
    output = { results: results };
  }

  // Write updated state
  writeState(cwd, state);

  // Output JSON
  if (output) {
    console.log(JSON.stringify(output));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/runner.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/runner.js
git commit -m "feat(supply-chain-defence): add runner.js orchestrator with profile-based check execution"
```

---

### Task 5: Popular Packages Data File

**Files:**
- Create: `plugins/supply-chain-defence/scripts/data/popular-packages.json`

- [ ] **Step 1: Generate the popular packages list**

Run an npm registry query to get the top packages by popularity. We need approximately 2000-3000 package names. The approach:

```bash
# Fetch top packages from npm — use the replicate.npmjs.com endpoint
# This is a large list, so we'll seed with a curated set of the most commonly
# typosquatted packages and expand from there.
# For the initial version, start with a curated list of ~500 high-risk packages
# (the ones most likely to be typosquatted) and expand in future updates.
```

Write a curated initial set to `plugins/supply-chain-defence/scripts/data/popular-packages.json`. This should include the top ~500 npm packages most likely to be targets of typosquatting. Organise alphabetically. Include at minimum: `axios`, `express`, `react`, `react-dom`, `next`, `vue`, `angular`, `lodash`, `moment`, `dayjs`, `chalk`, `debug`, `commander`, `inquirer`, `ora`, `yargs`, `minimist`, `dotenv`, `cors`, `helmet`, `jsonwebtoken`, `bcrypt`, `uuid`, `nanoid`, `zod`, `joi`, `ajv`, `typescript`, `webpack`, `vite`, `esbuild`, `rollup`, `babel`, `eslint`, `prettier`, `jest`, `mocha`, `vitest`, `playwright`, `puppeteer`, `cypress`, `mongoose`, `prisma`, `sequelize`, `typeorm`, `knex`, `pg`, `mysql2`, `redis`, `ioredis`, `aws-sdk`, `firebase`, `stripe`, `twilio`, `socket.io`, `ws`, `graphql`, `apollo`, `rxjs`, `ramda`, `immutable`, `immer`, `redux`, `mobx`, `zustand`, `jotai`, `recoil`, `swr`, `react-query`, `tanstack`, `tailwindcss`, `styled-components`, `emotion`, `sass`, `postcss`, `autoprefixer`, `nodemon`, `ts-node`, `tsx`, `concurrently`, `cross-env`, `rimraf`, `glob`, `fast-glob`, `chokidar`, `fs-extra`, `mkdirp`, `shelljs`, `execa`, `node-fetch`, `got`, `superagent`, `cheerio`, `jsdom`, `marked`, `highlight.js`, `sharp`, `jimp`, `multer`, `formidable`, `busboy`, `body-parser`, `cookie-parser`, `express-session`, `passport`, `express-validator`, `morgan`, `winston`, `pino`, `bunyan`, `lru-cache`, `bottleneck`, `p-limit`, `async`, `bluebird`, `date-fns`, `luxon`, `numeral`, `big.js`, `decimal.js`, `crypto-js`, `bcryptjs`, `argon2`, `jose`, `passport-jwt`, `cookie`, `tough-cookie`, `form-data`, `qs`, `query-string`, `url-parse`, `path-to-regexp`, `semver`, `compare-versions`, `yaml`, `toml`, `ini`, `xml2js`, `fast-xml-parser`, `csv-parse`, `papaparse`, `handlebars`, `ejs`, `pug`, `nunjucks`, `mustache`, and many more.

The engineer implementing this should generate a comprehensive list. The key requirement is that it must be a valid JSON array of strings, sorted alphabetically.

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "const d = require('./plugins/supply-chain-defence/scripts/data/popular-packages.json'); console.log(d.length + ' packages loaded')" `
Expected: Something like `500 packages loaded` (number should be > 400)

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/data/popular-packages.json
git commit -m "feat(supply-chain-defence): add curated popular packages list for typosquat detection"
```

---

## Phase 2: Check Scripts — Utility & Detection

### Task 6: Package Manager Detection Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/package-manager.js`

- [ ] **Step 1: Write package-manager.js**

Write to `plugins/supply-chain-defence/scripts/checks/package-manager.js`:

```javascript
"use strict";

const fs = require("fs");
const path = require("path");

// Detection order matches devs:deps-core
const LOCKFILE_MAP = [
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "package-lock.json", pm: "npm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "bun.lockb", pm: "bun" },
];

module.exports = async function packageManager(input, state, config, cwd) {
  for (const { file, pm } of LOCKFILE_MAP) {
    if (fs.existsSync(path.join(cwd, file))) {
      state.detectedPackageManager = pm;
      return {
        status: "pass",
        message: `Package manager detected: ${pm} (from ${file})`,
        details: { pm, lockfile: file },
      };
    }
  }

  // No lockfile found — check if package.json exists at all
  if (fs.existsSync(path.join(cwd, "package.json"))) {
    state.detectedPackageManager = "pnpm";
    return {
      status: "warn",
      message:
        "No lockfile found but package.json exists. Defaulting to pnpm. Run `pnpm install` to generate a lockfile.",
      details: { pm: "pnpm", lockfile: null },
    };
  }

  return {
    status: "info",
    message: "No package.json found — not a Node.js project",
    details: { pm: null, lockfile: null },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/package-manager.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/package-manager.js
git commit -m "feat(supply-chain-defence): add package manager detection check"
```

---

### Task 7: Lockfile Present Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/lockfile-present.js`

- [ ] **Step 1: Write lockfile-present.js**

Write to `plugins/supply-chain-defence/scripts/checks/lockfile-present.js`:

```javascript
"use strict";

const fs = require("fs");
const path = require("path");

const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
];

module.exports = async function lockfilePresent(input, state, config, cwd) {
  for (const file of LOCKFILES) {
    if (fs.existsSync(path.join(cwd, file))) {
      return {
        status: "pass",
        message: `Lockfile found: ${file}`,
        details: { lockfile: file },
      };
    }
  }

  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return {
      status: "info",
      message: "No package.json — not a Node.js project",
      details: {},
    };
  }

  return {
    status: "warn",
    message:
      "No lockfile found. Without a lockfile, dependency versions are not pinned and installs are not reproducible. Run your package manager to generate one.",
    details: {},
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/lockfile-present.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/lockfile-present.js
git commit -m "feat(supply-chain-defence): add lockfile presence check"
```

---

### Task 8: .npmrc Hardened Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/npmrc-hardened.js`

- [ ] **Step 1: Write npmrc-hardened.js**

Write to `plugins/supply-chain-defence/scripts/checks/npmrc-hardened.js`:

```javascript
"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_SETTINGS = {
  "ignore-scripts": "true",
  "package-lock": "true",
  "registry": "https://registry.npmjs.org/",
  "strict-ssl": "true",
  "npx-auto-install": "false",
  "save-exact": "true",
};

const RECOMMENDED_SETTINGS = {
  "audit-level": ["low", "moderate"],
  "min-release-age": null, // Any value > 0 is good
};

function parseNpmrc(content) {
  const settings = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    settings[key] = value;
  }
  return settings;
}

module.exports = async function npmrcHardened(input, state, config, cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");

  if (!fs.existsSync(npmrcPath)) {
    return {
      status: "warn",
      message:
        "No .npmrc file found. Project has no npm security configuration. Run /supply-chain-defence:harden to create one.",
      details: { missing: true },
    };
  }

  const content = fs.readFileSync(npmrcPath, "utf8");
  const settings = parseNpmrc(content);
  const missing = [];
  const wrong = [];

  for (const [key, expected] of Object.entries(REQUIRED_SETTINGS)) {
    if (!(key in settings)) {
      missing.push(key);
    } else if (settings[key] !== expected) {
      wrong.push(`${key}=${settings[key]} (expected ${expected})`);
    }
  }

  for (const [key, expected] of Object.entries(RECOMMENDED_SETTINGS)) {
    if (!(key in settings)) {
      missing.push(`${key} (recommended)`);
    } else if (Array.isArray(expected) && !expected.includes(settings[key])) {
      wrong.push(
        `${key}=${settings[key]} (recommended: ${expected.join(" or ")})`
      );
    }
  }

  if (missing.length === 0 && wrong.length === 0) {
    return {
      status: "pass",
      message: ".npmrc is properly hardened",
      details: { settings },
    };
  }

  const issues = [];
  if (missing.length > 0) issues.push(`Missing: ${missing.join(", ")}`);
  if (wrong.length > 0) issues.push(`Incorrect: ${wrong.join(", ")}`);

  return {
    status: "warn",
    message: `.npmrc needs hardening. ${issues.join(". ")}. Run /supply-chain-defence:harden to fix.`,
    details: { missing, wrong, settings },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/npmrc-hardened.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/npmrc-hardened.js
git commit -m "feat(supply-chain-defence): add .npmrc hardening check"
```

---

### Task 9: Socket Present Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/socket-present.js`

- [ ] **Step 1: Write socket-present.js**

Write to `plugins/supply-chain-defence/scripts/checks/socket-present.js`:

```javascript
"use strict";

const { execSync } = require("child_process");

module.exports = async function socketPresent(input, state, config, cwd) {
  try {
    execSync("socket --version", {
      cwd,
      stdio: "pipe",
      timeout: 5000,
    });
    return {
      status: "pass",
      message: "Socket.dev CLI is installed",
      details: {},
    };
  } catch {
    return {
      status: "block",
      message:
        "Socket.dev CLI is not installed or not in PATH. Socket provides real-time malware and typosquatting detection. Install with: npm install -g @socketsecurity/cli — or run /supply-chain-defence:doctor --auto-fix",
      details: { key: "_" },
    };
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/socket-present.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/socket-present.js
git commit -m "feat(supply-chain-defence): add Socket.dev CLI presence check"
```

---

### Task 10: Typosquat Local Check (Levenshtein)

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/typosquat-local.js`

- [ ] **Step 1: Write typosquat-local.js**

Write to `plugins/supply-chain-defence/scripts/checks/typosquat-local.js`:

```javascript
"use strict";

const path = require("path");

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function extractPackageNames(command) {
  // Parse package names from install/add commands
  // e.g. "npm install lodash express" → ["lodash", "express"]
  // e.g. "pnpm add -D @types/node" → ["@types/node"]
  const parts = command.split(/\s+/);
  const packages = [];
  let pastCommand = false;

  for (const part of parts) {
    // Skip the package manager name and subcommand
    if (!pastCommand) {
      if (
        part === "install" ||
        part === "add" ||
        part === "i"
      ) {
        pastCommand = true;
      }
      continue;
    }
    // Skip flags
    if (part.startsWith("-")) continue;
    // Skip version specifiers attached to package (lodash@4.17.21)
    const name = part.split("@")[0] || part;
    if (name) packages.push(part.includes("@") && part.startsWith("@") ? part.split("@").slice(0, 2).join("@") : name);
  }

  return packages;
}

module.exports = async function typosquatLocal(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packageNames = extractPackageNames(command);

  if (packageNames.length === 0) {
    return { status: "pass", message: "No package names to check", details: {} };
  }

  const dataPath = path.join(__dirname, "..", "data", "popular-packages.json");
  let popularPackages;
  try {
    popularPackages = require(dataPath);
  } catch {
    return {
      status: "info",
      message: "Could not load popular packages list for typosquat check",
      details: {},
    };
  }

  const maxDist = config.thresholds.typosquatMaxDistance || 2;
  const suspects = [];

  for (const pkg of packageNames) {
    // Skip if it's an exact match (it IS the popular package)
    if (popularPackages.includes(pkg)) continue;

    // Strip scope for comparison
    const bare = pkg.startsWith("@") ? pkg.split("/")[1] || pkg : pkg;

    for (const popular of popularPackages) {
      const popularBare = popular.startsWith("@")
        ? popular.split("/")[1] || popular
        : popular;
      const dist = levenshtein(bare, popularBare);
      if (dist > 0 && dist <= maxDist) {
        suspects.push({ pkg, similarTo: popular, distance: dist });
        break; // One match is enough to flag
      }
    }
  }

  if (suspects.length === 0) {
    return {
      status: "pass",
      message: "No typosquatting suspects found",
      details: {},
    };
  }

  const lines = suspects.map(
    (s) =>
      `"${s.pkg}" is suspiciously similar to "${s.similarTo}" (edit distance: ${s.distance})`
  );

  return {
    status: "block",
    message:
      "Possible typosquatting detected:\n" +
      lines.join("\n") +
      "\n\nVerify these are the correct package names before proceeding.",
    details: { key: suspects[0].pkg, suspects },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/typosquat-local.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/typosquat-local.js
git commit -m "feat(supply-chain-defence): add local typosquatting detection via Levenshtein distance"
```

---

### Task 11: Typosquat Bulk Check (SessionStart)

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/typosquat-bulk.js`

- [ ] **Step 1: Write typosquat-bulk.js**

This check scans all dependencies in `package.json` against the popular packages list. Used by the `quick` profile at session start.

Write to `plugins/supply-chain-defence/scripts/checks/typosquat-bulk.js`:

```javascript
"use strict";

const fs = require("fs");
const path = require("path");

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

module.exports = async function typosquatBulk(input, state, config, cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return {
      status: "warn",
      message: "Could not parse package.json",
      details: {},
    };
  }

  const allDeps = Object.keys({
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.peerDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  });

  if (allDeps.length === 0) {
    return { status: "pass", message: "No dependencies to check", details: {} };
  }

  const dataPath = path.join(__dirname, "..", "data", "popular-packages.json");
  let popularPackages;
  try {
    popularPackages = require(dataPath);
  } catch {
    return {
      status: "info",
      message: "Could not load popular packages list",
      details: {},
    };
  }

  // Build a Set for fast exact-match lookup
  const popularSet = new Set(popularPackages);
  const maxDist = config.thresholds.typosquatMaxDistance || 2;
  const suspects = [];

  for (const dep of allDeps) {
    // Skip if it's an exact match
    if (popularSet.has(dep)) continue;

    const bare = dep.startsWith("@") ? dep.split("/")[1] || dep : dep;

    for (const popular of popularPackages) {
      const popularBare = popular.startsWith("@")
        ? popular.split("/")[1] || popular
        : popular;
      const dist = levenshtein(bare, popularBare);
      if (dist > 0 && dist <= maxDist) {
        suspects.push({ dep, similarTo: popular, distance: dist });
        break;
      }
    }
  }

  if (suspects.length === 0) {
    return {
      status: "pass",
      message: `Checked ${allDeps.length} dependencies — no typosquatting suspects`,
      details: { checked: allDeps.length },
    };
  }

  const lines = suspects.map(
    (s) =>
      `"${s.dep}" looks like "${s.similarTo}" (edit distance: ${s.distance})`
  );

  return {
    status: "warn",
    message:
      "Possible typosquatting in existing dependencies:\n" +
      lines.join("\n") +
      "\n\nReview these packages carefully.",
    details: { suspects, checked: allDeps.length },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/typosquat-bulk.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/typosquat-bulk.js
git commit -m "feat(supply-chain-defence): add bulk typosquat scan for session start"
```

---

## Phase 3: Check Scripts — Bash Guard Checks

### Task 12: CI Over Install Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/ci-over-install.js`

- [ ] **Step 1: Write ci-over-install.js**

Write to `plugins/supply-chain-defence/scripts/checks/ci-over-install.js`:

```javascript
"use strict";

// Maps package manager to their "clean install" equivalent
const CI_COMMANDS = {
  npm: { install: "npm ci", flag: null },
  pnpm: { install: "pnpm install --frozen-lockfile", flag: "--frozen-lockfile" },
  yarn: { install: "yarn install --immutable", flag: "--immutable" },
  bun: { install: "bun install --frozen-lockfile", flag: "--frozen-lockfile" },
};

module.exports = async function ciOverInstall(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();

  // Detect which PM is being used in the command
  const pm = state.detectedPackageManager || "npm";

  // Check if this is a bare "install" (no package being added)
  // e.g. "npm install" or "pnpm install" but NOT "npm install lodash"
  const patterns = [
    /^npm\s+install\s*$/,
    /^npm\s+i\s*$/,
    /^pnpm\s+install\s*$/,
    /^pnpm\s+i\s*$/,
    /^yarn\s+install\s*$/,
    /^yarn\s*$/,
    /^bun\s+install\s*$/,
    /^bun\s+i\s*$/,
  ];

  // Also match with trailing flags but no package name
  const patternsWithFlags = [
    /^npm\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
    /^pnpm\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
    /^yarn\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
    /^bun\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
  ];

  const isBareInstall =
    patterns.some((p) => p.test(command)) ||
    patternsWithFlags.some((p) => p.test(command));

  if (!isBareInstall) {
    return { status: "pass", message: "Not a bare install command", details: {} };
  }

  // Check if it's already a ci/frozen-lockfile command
  if (
    /\bnpm\s+ci\b/.test(command) ||
    /--frozen-lockfile/.test(command) ||
    /--immutable/.test(command)
  ) {
    return {
      status: "pass",
      message: "Already using clean install",
      details: {},
    };
  }

  const ciInfo = CI_COMMANDS[pm] || CI_COMMANDS.npm;

  return {
    status: "block",
    message: `Use \`${ciInfo.install}\` instead of bare install. Clean installs respect the lockfile exactly and prevent unexpected version resolution. This ensures reproducible builds.`,
    details: { key: "bare-install", suggested: ciInfo.install },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/ci-over-install.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/ci-over-install.js
git commit -m "feat(supply-chain-defence): add ci-over-install check to enforce lockfile-respecting installs"
```

---

### Task 13: Before Flag Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/before-flag.js`

- [ ] **Step 1: Write before-flag.js**

Write to `plugins/supply-chain-defence/scripts/checks/before-flag.js`:

```javascript
"use strict";

module.exports = async function beforeFlag(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();

  // Only check commands that add new packages
  const isAddingPackage =
    /^(npm|pnpm|yarn|bun)\s+(install|add|i)\s+\S/.test(command) &&
    !/^(npm)\s+ci\b/.test(command);

  if (!isAddingPackage) {
    return { status: "pass", message: "Not adding a package", details: {} };
  }

  // Check if --before is already present
  if (/--before\b/.test(command)) {
    return {
      status: "pass",
      message: "--before flag already present",
      details: {},
    };
  }

  const days = config.thresholds.beforeFlagDays || 5;
  const beforeDate = new Date(Date.now() - days * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  return {
    status: "block",
    message:
      `Add \`--before ${beforeDate}\` to avoid installing packages published in the last ${days} days. ` +
      `Recently published versions are higher risk — the Axios attack used a version that existed for only 39 minutes. ` +
      `This flag ensures you only install versions that have been available long enough for the community to detect issues.`,
    details: { key: command, suggestedDate: beforeDate },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/before-flag.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/before-flag.js
git commit -m "feat(supply-chain-defence): add --before flag enforcement for new package installs"
```

---

### Task 14: Install Scripts Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/install-scripts.js`

- [ ] **Step 1: Write install-scripts.js**

Write to `plugins/supply-chain-defence/scripts/checks/install-scripts.js`:

```javascript
"use strict";

const { execSync } = require("child_process");

function extractPackageNames(command) {
  const parts = command.split(/\s+/);
  const packages = [];
  let pastCommand = false;

  for (const part of parts) {
    if (!pastCommand) {
      if (part === "install" || part === "add" || part === "i") {
        pastCommand = true;
      }
      continue;
    }
    if (part.startsWith("-")) continue;
    // Handle scoped packages and version specifiers
    const name = part.replace(/@[\d^~>=<.*]+$/, "");
    if (name) packages.push(name);
  }
  return packages;
}

module.exports = async function installScripts(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();
  const packageNames = extractPackageNames(command);

  if (packageNames.length === 0) {
    return { status: "pass", message: "No packages to check", details: {} };
  }

  const flagged = [];

  for (const pkg of packageNames) {
    try {
      const output = execSync(`npm view ${pkg} scripts --json 2>/dev/null`, {
        cwd,
        stdio: "pipe",
        timeout: 10000,
        encoding: "utf8",
      });

      const scripts = JSON.parse(output || "{}");
      const dangerous = ["preinstall", "postinstall", "install", "prepare"];
      const found = dangerous.filter((s) => s in scripts);

      if (found.length > 0) {
        flagged.push({ pkg, scripts: found });
      }
    } catch {
      // Registry lookup failed — skip silently
    }
  }

  if (flagged.length === 0) {
    return {
      status: "pass",
      message: "No lifecycle scripts detected in target packages",
      details: {},
    };
  }

  const lines = flagged.map(
    (f) => `"${f.pkg}" has lifecycle scripts: ${f.scripts.join(", ")}`
  );

  return {
    status: "block",
    message:
      "Packages with lifecycle scripts detected:\n" +
      lines.join("\n") +
      "\n\nLifecycle scripts (preinstall, postinstall) are the primary malware execution vector in npm supply chain attacks. " +
      "Ensure ignore-scripts=true in .npmrc and review these scripts before allowing execution.",
    details: { key: flagged[0].pkg, flagged },
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/install-scripts.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/install-scripts.js
git commit -m "feat(supply-chain-defence): add lifecycle script detection for installed packages"
```

---

### Task 15: Dependency Direct Edit Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/dep-direct-edit.js`

- [ ] **Step 1: Write dep-direct-edit.js**

Write to `plugins/supply-chain-defence/scripts/checks/dep-direct-edit.js`:

```javascript
"use strict";

const fs = require("fs");
const path = require("path");

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "overrides",
];

// Regex patterns that match dependency field names in JSON
const DEP_PATTERNS = DEP_FIELDS.map(
  (f) => new RegExp(`"${f}"\\s*:`)
);

module.exports = async function depDirectEdit(input, state, config, cwd) {
  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};

  // For Edit: check old_string and new_string
  if (toolName === "Edit") {
    const oldStr = toolInput.old_string || "";
    const newStr = toolInput.new_string || "";
    const combined = oldStr + "\n" + newStr;

    const touchesDeps = DEP_PATTERNS.some((p) => p.test(combined));
    if (!touchesDeps) {
      return {
        status: "pass",
        message: "Edit does not touch dependency fields",
        details: {},
      };
    }

    return {
      status: "block",
      message:
        "Direct edits to dependency fields in package.json are not allowed. " +
        "Use the package manager instead:\n" +
        "  - Add: `pnpm add <package>` (or npm/yarn equivalent)\n" +
        "  - Remove: `pnpm remove <package>`\n" +
        "  - Update: `pnpm update <package>`\n\n" +
        "This ensures the lockfile stays in sync and integrity hashes are updated.",
      details: {},
    };
  }

  // For Write: compare new content against current file
  if (toolName === "Write") {
    const filePath = toolInput.file_path || "";
    const newContent = toolInput.content || "";

    let currentContent = "{}";
    try {
      currentContent = fs.readFileSync(filePath, "utf8");
    } catch {
      // File doesn't exist yet — allow creation
      return {
        status: "pass",
        message: "New file creation — no existing deps to compare",
        details: {},
      };
    }

    let currentPkg, newPkg;
    try {
      currentPkg = JSON.parse(currentContent);
      newPkg = JSON.parse(newContent);
    } catch {
      return {
        status: "pass",
        message: "Could not parse package.json — skipping check",
        details: {},
      };
    }

    const changed = [];
    for (const field of DEP_FIELDS) {
      const currentVal = JSON.stringify(currentPkg[field] || {});
      const newVal = JSON.stringify(newPkg[field] || {});
      if (currentVal !== newVal) {
        changed.push(field);
      }
    }

    if (changed.length === 0) {
      return {
        status: "pass",
        message: "Write does not change dependency fields",
        details: {},
      };
    }

    return {
      status: "block",
      message:
        `Direct writes to package.json that change ${changed.join(", ")} are not allowed. ` +
        "Use the package manager to modify dependencies so the lockfile stays in sync.",
      details: { changedFields: changed },
    };
  }

  return { status: "pass", message: "Not an Edit or Write", details: {} };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/dep-direct-edit.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/dep-direct-edit.js
git commit -m "feat(supply-chain-defence): add dependency direct-edit block for package.json"
```

---

## Phase 4: Check Scripts — Deep/Async Checks

### Task 16: Lockfile Integrity Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/lockfile-integrity.js`

- [ ] **Step 1: Write lockfile-integrity.js**

Write to `plugins/supply-chain-defence/scripts/checks/lockfile-integrity.js`:

```javascript
"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function detectLockfile(cwd) {
  const lockfiles = [
    { file: "pnpm-lock.yaml", type: "pnpm" },
    { file: "package-lock.json", type: "npm" },
    { file: "yarn.lock", type: "yarn" },
  ];
  for (const { file, type } of lockfiles) {
    if (fs.existsSync(path.join(cwd, file))) {
      return { file, type };
    }
  }
  return null;
}

module.exports = async function lockfileIntegrity(input, state, config, cwd) {
  const lockfile = detectLockfile(cwd);
  if (!lockfile) {
    return {
      status: "info",
      message: "No lockfile found — skipping integrity check",
      details: {},
    };
  }

  // Check if lockfile-lint is available
  try {
    execSync("npx lockfile-lint --version", {
      cwd,
      stdio: "pipe",
      timeout: 10000,
    });
  } catch {
    return {
      status: "warn",
      message:
        "lockfile-lint not available. Install with: npm install -g lockfile-lint",
      details: {},
    };
  }

  try {
    const result = execSync(
      `npx lockfile-lint --path ${lockfile.file} --type ${lockfile.type} --allowed-hosts npm --validate-https`,
      { cwd, stdio: "pipe", timeout: 30000, encoding: "utf8" }
    );

    return {
      status: "pass",
      message: `Lockfile integrity check passed (${lockfile.file})`,
      details: { output: result.trim() },
    };
  } catch (err) {
    const stderr = err.stderr?.toString() || err.stdout?.toString() || "";
    return {
      status: "warn",
      message: `Lockfile integrity issues found in ${lockfile.file}:\n${stderr.trim()}`,
      details: { output: stderr.trim() },
    };
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/lockfile-integrity.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/lockfile-integrity.js
git commit -m "feat(supply-chain-defence): add lockfile-lint integrity check"
```

---

### Task 17: Lockfile Drift Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/lockfile-drift.js`

- [ ] **Step 1: Write lockfile-drift.js**

Write to `plugins/supply-chain-defence/scripts/checks/lockfile-drift.js`:

```javascript
"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
];

module.exports = async function lockfileDrift(input, state, config, cwd) {
  // Find which lockfile exists
  let lockfile = null;
  for (const f of LOCKFILES) {
    if (fs.existsSync(path.join(cwd, f))) {
      lockfile = f;
      break;
    }
  }

  if (!lockfile) {
    return { status: "info", message: "No lockfile found", details: {} };
  }

  // Check if lockfile has uncommitted changes
  try {
    const diff = execSync(`git diff --name-only -- "${lockfile}"`, {
      cwd,
      stdio: "pipe",
      timeout: 5000,
      encoding: "utf8",
    });

    const stagedDiff = execSync(
      `git diff --cached --name-only -- "${lockfile}"`,
      { cwd, stdio: "pipe", timeout: 5000, encoding: "utf8" }
    );

    const hasChanges =
      diff.trim().length > 0 || stagedDiff.trim().length > 0;

    if (!hasChanges) {
      return {
        status: "pass",
        message: `${lockfile} has no uncommitted changes`,
        details: {},
      };
    }

    // Get a summary of what changed
    let summary = "";
    try {
      summary = execSync(`git diff --stat -- "${lockfile}"`, {
        cwd,
        stdio: "pipe",
        timeout: 5000,
        encoding: "utf8",
      }).trim();
    } catch {
      summary = "Could not get diff summary";
    }

    return {
      status: "warn",
      message: `${lockfile} has uncommitted changes. This may indicate unexpected dependency modifications:\n${summary}`,
      details: { lockfile, summary },
    };
  } catch {
    // Not a git repo or git not available
    return {
      status: "info",
      message: "Could not check lockfile drift — not a git repository or git unavailable",
      details: {},
    };
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/lockfile-drift.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/lockfile-drift.js
git commit -m "feat(supply-chain-defence): add lockfile drift detection via git diff"
```

---

### Task 18: npm Audit Check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/npm-audit.js`

- [ ] **Step 1: Write npm-audit.js**

Write to `plugins/supply-chain-defence/scripts/checks/npm-audit.js`:

```javascript
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const AUDIT_COMMANDS = {
  npm: "npm audit --json",
  pnpm: "pnpm audit --json",
  yarn: "yarn npm audit --json",
};

module.exports = async function npmAudit(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const pm = state.detectedPackageManager || "npm";
  const cmd = AUDIT_COMMANDS[pm] || AUDIT_COMMANDS.npm;

  try {
    const output = execSync(cmd, {
      cwd,
      stdio: "pipe",
      timeout: 60000,
      encoding: "utf8",
    });

    // npm audit exits 0 when no vulnerabilities
    return {
      status: "pass",
      message: `${pm} audit: no vulnerabilities found`,
      details: {},
    };
  } catch (err) {
    // npm audit exits non-zero when vulnerabilities found
    const stdout = err.stdout?.toString() || "";

    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return {
        status: "warn",
        message: `${pm} audit returned non-parseable output`,
        details: { raw: stdout.slice(0, 500) },
      };
    }

    // npm format
    const vulns = parsed.metadata?.vulnerabilities || {};
    const total =
      (vulns.critical || 0) +
      (vulns.high || 0) +
      (vulns.moderate || 0) +
      (vulns.low || 0);

    if (total === 0) {
      return {
        status: "pass",
        message: `${pm} audit: no vulnerabilities found`,
        details: {},
      };
    }

    const summary = [];
    if (vulns.critical) summary.push(`${vulns.critical} critical`);
    if (vulns.high) summary.push(`${vulns.high} high`);
    if (vulns.moderate) summary.push(`${vulns.moderate} moderate`);
    if (vulns.low) summary.push(`${vulns.low} low`);

    return {
      status: "warn",
      message: `${pm} audit found ${total} vulnerabilities: ${summary.join(", ")}. Run \`${pm} audit\` for details.`,
      details: { vulnerabilities: vulns, total },
    };
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/npm-audit.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/npm-audit.js
git commit -m "feat(supply-chain-defence): add npm/pnpm audit check"
```

---

### Task 19: Security Summary Check (PreCompact/Subagent)

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/security-summary.js`

- [ ] **Step 1: Write security-summary.js**

Write to `plugins/supply-chain-defence/scripts/checks/security-summary.js`:

```javascript
"use strict";

module.exports = async function securitySummary(input, state, config, cwd) {
  const lines = [];

  if (state.detectedPackageManager) {
    lines.push(
      `Package manager: ${state.detectedPackageManager}`
    );
  }

  // Summarise block-then-warn state
  const blocked = state.blocked || {};
  const ttlMs = (config.thresholds.blockThenWarnTTLHours || 8) * 3600 * 1000;
  const now = Date.now();
  const activeBlocks = [];

  for (const [category, entries] of Object.entries(blocked)) {
    for (const [key, timestamp] of Object.entries(entries)) {
      if (now - timestamp < ttlMs) {
        activeBlocks.push(
          `${category}: ${key === "_" ? "(global)" : key}`
        );
      }
    }
  }

  if (activeBlocks.length > 0) {
    lines.push(
      "Active block-then-warn entries (will warn instead of block):"
    );
    for (const b of activeBlocks) {
      lines.push(`  - ${b}`);
    }
  }

  if (lines.length === 0) {
    lines.push("No supply chain security context to preserve.");
  }

  return {
    status: "info",
    message: lines.join("\n"),
    details: {},
  };
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check plugins/supply-chain-defence/scripts/checks/security-summary.js && echo "Syntax OK"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/security-summary.js
git commit -m "feat(supply-chain-defence): add security summary for context preservation"
```

---

## Phase 5: Check Scripts — Doctor Checks

### Task 20: Doctor Check Scripts

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/node-version.js`
- Create: `plugins/supply-chain-defence/scripts/checks/pm-detected.js`
- Create: `plugins/supply-chain-defence/scripts/checks/socket-installed.js`
- Create: `plugins/supply-chain-defence/scripts/checks/lockfile-lint-installed.js`
- Create: `plugins/supply-chain-defence/scripts/checks/cyclonedx-installed.js`
- Create: `plugins/supply-chain-defence/scripts/checks/jq-installed.js`
- Create: `plugins/supply-chain-defence/scripts/checks/scripts-synced.js`

- [ ] **Step 1: Write all doctor check scripts**

Each doctor check follows the same pattern: try to run a command, report pass/info based on availability.

Write `plugins/supply-chain-defence/scripts/checks/node-version.js`:

```javascript
"use strict";
const { execSync } = require("child_process");

module.exports = async function nodeVersion(input, state, config, cwd) {
  try {
    const version = execSync("node --version", {
      stdio: "pipe", timeout: 5000, encoding: "utf8",
    }).trim();
    const major = parseInt(version.replace("v", "").split(".")[0], 10);
    if (major < 18) {
      return {
        status: "warn",
        message: `Node.js ${version} detected — version 18+ recommended`,
        details: { version },
      };
    }
    return {
      status: "pass",
      message: `Node.js ${version}`,
      details: { version },
    };
  } catch {
    return {
      status: "warn",
      message: "Node.js not found",
      details: {},
    };
  }
};
```

Write `plugins/supply-chain-defence/scripts/checks/pm-detected.js`:

```javascript
"use strict";
// Reuses the package-manager check but adapted for doctor context
const packageManager = require("./package-manager");

module.exports = async function pmDetected(input, state, config, cwd) {
  return packageManager(input, state, config, cwd);
};
```

Write `plugins/supply-chain-defence/scripts/checks/socket-installed.js`:

```javascript
"use strict";
const { execSync } = require("child_process");

module.exports = async function socketInstalled(input, state, config, cwd) {
  try {
    const version = execSync("socket --version", {
      stdio: "pipe", timeout: 5000, encoding: "utf8",
    }).trim();
    return {
      status: "pass",
      message: `Socket.dev CLI ${version}`,
      details: { version },
    };
  } catch {
    return {
      status: "warn",
      message: "Socket.dev CLI not installed. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }
};
```

Write `plugins/supply-chain-defence/scripts/checks/lockfile-lint-installed.js`:

```javascript
"use strict";
const { execSync } = require("child_process");

module.exports = async function lockfileLintInstalled(input, state, config, cwd) {
  try {
    const version = execSync("npx lockfile-lint --version", {
      stdio: "pipe", timeout: 10000, encoding: "utf8",
    }).trim();
    return {
      status: "pass",
      message: `lockfile-lint ${version}`,
      details: { version },
    };
  } catch {
    return {
      status: "warn",
      message: "lockfile-lint not installed. Install: npm install -g lockfile-lint",
      details: {},
    };
  }
};
```

Write `plugins/supply-chain-defence/scripts/checks/cyclonedx-installed.js`:

```javascript
"use strict";
const { execSync } = require("child_process");

module.exports = async function cyclonedxInstalled(input, state, config, cwd) {
  try {
    execSync("npx @cyclonedx/cyclonedx-npm --version", {
      stdio: "pipe", timeout: 10000, encoding: "utf8",
    });
    return {
      status: "pass",
      message: "CycloneDX npm (SBOM generation) available",
      details: {},
    };
  } catch {
    return {
      status: "info",
      message: "CycloneDX npm not installed (optional — for SBOM generation)",
      details: {},
    };
  }
};
```

Write `plugins/supply-chain-defence/scripts/checks/jq-installed.js`:

```javascript
"use strict";
const { execSync } = require("child_process");

module.exports = async function jqInstalled(input, state, config, cwd) {
  try {
    execSync("jq --version", {
      stdio: "pipe", timeout: 5000, encoding: "utf8",
    });
    return {
      status: "pass",
      message: "jq available",
      details: {},
    };
  } catch {
    return {
      status: "info",
      message: "jq not installed (optional — used by some advanced checks)",
      details: {},
    };
  }
};
```

Write `plugins/supply-chain-defence/scripts/checks/scripts-synced.js`:

```javascript
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function scriptsSynced(input, state, config, cwd) {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) {
    return {
      status: "info",
      message: "CLAUDE_PLUGIN_DATA not set — cannot verify script sync",
      details: {},
    };
  }

  const versionPath = path.join(dataDir, "scripts", "VERSION");
  if (!fs.existsSync(versionPath)) {
    return {
      status: "warn",
      message: "Scripts not synced to CLAUDE_PLUGIN_DATA. Restart session to trigger sync.",
      details: {},
    };
  }

  const version = fs.readFileSync(versionPath, "utf8").trim();
  return {
    status: "pass",
    message: `Scripts synced (version ${version})`,
    details: { version },
  };
};
```

- [ ] **Step 2: Verify all syntax**

Run: `for f in plugins/supply-chain-defence/scripts/checks/{node-version,pm-detected,socket-installed,lockfile-lint-installed,cyclonedx-installed,jq-installed,scripts-synced}.js; do node --check "$f" && echo "$f OK"; done`
Expected: All files report OK

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/node-version.js \
  plugins/supply-chain-defence/scripts/checks/pm-detected.js \
  plugins/supply-chain-defence/scripts/checks/socket-installed.js \
  plugins/supply-chain-defence/scripts/checks/lockfile-lint-installed.js \
  plugins/supply-chain-defence/scripts/checks/cyclonedx-installed.js \
  plugins/supply-chain-defence/scripts/checks/jq-installed.js \
  plugins/supply-chain-defence/scripts/checks/scripts-synced.js
git commit -m "feat(supply-chain-defence): add doctor check scripts for toolchain validation"
```

---

## Phase 6: Check Scripts — Remaining Checks

### Task 21: Remaining Check Script Stubs

**Files:**
- Create stubs for all remaining checks referenced in config.json profiles

The following checks are used by the `deep`, `review`, `file-changed`, and `npx-post-audit` profiles. They require network access or external tool integration and are more complex. Create them as functional stubs that return `info` status with a "not yet implemented" message. This lets the runner and hooks work end-to-end while these are fleshed out incrementally.

- [ ] **Step 1: Write stub checks**

Create each of these files with the same pattern:

`plugins/supply-chain-defence/scripts/checks/socket-scan.js`:
```javascript
"use strict";
module.exports = async function socketScan(input, state, config, cwd) {
  return { status: "info", message: "Socket scan: not yet implemented — requires Socket.dev API integration", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/install-scripts-bulk.js`:
```javascript
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function installScriptsBulk(input, state, config, cwd) {
  return { status: "info", message: "Bulk lifecycle script scan: not yet implemented", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/before-flag-config.js`:
```javascript
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function beforeFlagConfig(input, state, config, cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");
  if (!fs.existsSync(npmrcPath)) {
    return { status: "warn", message: "No .npmrc — min-release-age not configured", details: {} };
  }
  const content = fs.readFileSync(npmrcPath, "utf8");
  if (/min-release-age\s*=/.test(content)) {
    return { status: "pass", message: "min-release-age is configured in .npmrc", details: {} };
  }
  return { status: "warn", message: "min-release-age not set in .npmrc. Add min-release-age=5 to prevent installing freshly published packages.", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/sbom-freshness.js`:
```javascript
"use strict";
module.exports = async function sbomFreshness(input, state, config, cwd) {
  return { status: "info", message: "SBOM freshness: not yet implemented (optional feature)", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/registry-metadata.js`:
```javascript
"use strict";
module.exports = async function registryMetadata(input, state, config, cwd) {
  return { status: "info", message: "Registry metadata check: not yet implemented — requires npm registry API", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/dependency-tree.js`:
```javascript
"use strict";
module.exports = async function dependencyTree(input, state, config, cwd) {
  return { status: "info", message: "Dependency tree analysis: not yet implemented", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/maintainer-history.js`:
```javascript
"use strict";
module.exports = async function maintainerHistory(input, state, config, cwd) {
  return { status: "info", message: "Maintainer history check: not yet implemented — requires npm registry API", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/provenance-check.js`:
```javascript
"use strict";
module.exports = async function provenanceCheck(input, state, config, cwd) {
  return { status: "info", message: "Provenance check: not yet implemented — requires npm audit signatures", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/npx-audit.js`:
```javascript
"use strict";
module.exports = async function npxAudit(input, state, config, cwd) {
  return { status: "info", message: "npx post-execution audit: not yet implemented", details: {} };
};
```

`plugins/supply-chain-defence/scripts/checks/npmrc-changed.js`:
```javascript
"use strict";
module.exports = async function npmrcChanged(input, state, config, cwd) {
  return { status: "info", message: ".npmrc change detected — review for unexpected modifications", details: {} };
};
```

- [ ] **Step 2: Verify all syntax**

Run: `for f in plugins/supply-chain-defence/scripts/checks/{socket-scan,install-scripts-bulk,before-flag-config,sbom-freshness,registry-metadata,dependency-tree,maintainer-history,provenance-check,npx-audit,npmrc-changed}.js; do node --check "$f" && echo "$f OK"; done`
Expected: All files report OK

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/socket-scan.js \
  plugins/supply-chain-defence/scripts/checks/install-scripts-bulk.js \
  plugins/supply-chain-defence/scripts/checks/before-flag-config.js \
  plugins/supply-chain-defence/scripts/checks/sbom-freshness.js \
  plugins/supply-chain-defence/scripts/checks/registry-metadata.js \
  plugins/supply-chain-defence/scripts/checks/dependency-tree.js \
  plugins/supply-chain-defence/scripts/checks/maintainer-history.js \
  plugins/supply-chain-defence/scripts/checks/provenance-check.js \
  plugins/supply-chain-defence/scripts/checks/npx-audit.js \
  plugins/supply-chain-defence/scripts/checks/npmrc-changed.js
git commit -m "feat(supply-chain-defence): add stub checks for deep/review/async profiles"
```

---

## Phase 7: Hooks Configuration

### Task 22: hooks.json

**Files:**
- Create: `plugins/supply-chain-defence/hooks/hooks.json`

- [ ] **Step 1: Write hooks.json**

Write to `plugins/supply-chain-defence/hooks/hooks.json`:

```json
{
  "description": "Supply chain defence hooks — deterministic Node.js scripts guarding npm/pnpm/yarn operations",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/sync.sh",
            "timeout": 10,
            "statusMessage": "Syncing supply chain scripts"
          }
        ]
      },
      {
        "matcher": "startup|resume|clear",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile quick",
            "timeout": 30,
            "statusMessage": "Supply chain health check"
          }
        ]
      },
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile deep",
            "async": true,
            "timeout": 300,
            "statusMessage": "Deep supply chain audit"
          }
        ]
      }
    ],
    "PreToolUse": [
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
      },
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "if": "Edit(**/package.json)",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile edit-guard",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "if": "Write(**/package.json)",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile write-guard",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
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
          },
          {
            "type": "command",
            "if": "Bash(npx *)",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile npx-post-audit",
            "async": true,
            "timeout": 60
          }
        ]
      }
    ],
    "FileChanged": [
      {
        "matcher": "package-lock.json|pnpm-lock.yaml|yarn.lock|.npmrc",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile file-changed",
            "timeout": 10
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "auto|manual",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile pre-compact",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile subagent-context",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `cat plugins/supply-chain-defence/hooks/hooks.json | python3 -m json.tool > /dev/null && echo "Valid"`
Expected: `Valid`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/hooks/hooks.json
git commit -m "feat(supply-chain-defence): add hooks.json with all lifecycle hook configurations"
```

---

## Phase 8: Skills

### Task 23: Setup Skill

**Files:**
- Create: `plugins/supply-chain-defence/skills/setup/SKILL.md`

- [ ] **Step 1: Write setup SKILL.md**

Write to `plugins/supply-chain-defence/skills/setup/SKILL.md`:

```markdown
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

Create `.claude/agent-foundry/supply-chain-defence.local.json` if it doesn't exist:

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
```

- [ ] **Step 2: Commit**

```bash
git add plugins/supply-chain-defence/skills/setup/SKILL.md
git commit -m "feat(supply-chain-defence): add setup skill for tool installation and configuration"
```

---

### Task 24: Harden Skill

**Files:**
- Create: `plugins/supply-chain-defence/skills/harden/SKILL.md`

- [ ] **Step 1: Write harden SKILL.md**

Write to `plugins/supply-chain-defence/skills/harden/SKILL.md`:

```markdown
---
name: supply-chain-defence:harden
description: >-
  This skill should be used when the user asks to "harden npm config",
  "create .npmrc", "secure my npm setup", "configure lockfile-lint",
  "add preinstall script", "harden package.json", "generate security config",
  "add CI security checks", or "harden my project against supply chain attacks".
  Generates or updates configuration files only — does not install tools.
---

# Supply Chain Hardening

Generate or update project configuration files for supply chain security. This skill writes config files — it does not install tools (use `setup` for that).

## 1. .npmrc

Check if `.npmrc` exists in the project root. Create or update with these settings:

```ini
# Supply chain defence — hardened npm configuration
ignore-scripts=true
package-lock=true
registry=https://registry.npmjs.org/
strict-ssl=true
audit-level=low
npx-auto-install=false
save-exact=true
min-release-age=5
```

**Important:** Preserve any existing settings the user has that don't conflict (e.g., custom `//registry.npmjs.org/:_authToken` lines, `@scope:registry` entries). Only add/update the security-relevant settings listed above.

## 2. .lockfile-lintrc

Create `.lockfile-lintrc` in the project root if `lockfile-lint` is installed:

```json
{
  "path": "<detected-lockfile>",
  "type": "<detected-pm>",
  "allowed-hosts": ["npm"],
  "validate-https": true,
  "validate-integrity": true
}
```

Set `path` and `type` based on the detected package manager and lockfile.

## 3. package.json Scripts

Add or update security-related scripts in `package.json`. Use the package manager (not direct file editing) where possible. For scripts that must be added to `package.json`, use `npm pkg set` or equivalent:

**preinstall script:**
```bash
npm pkg set scripts.preinstall="npx lockfile-lint --path <lockfile> --type <pm> --allowed-hosts npm --validate-https"
```

**audit script:**
```bash
npm pkg set scripts.audit:security="npm audit && npx lockfile-lint --path <lockfile> --type <pm> --allowed-hosts npm --validate-https"
```

Adapt commands for the detected package manager (pnpm/yarn equivalents).

## 4. CI Workflow Snippet (GitHub Actions)

Offer to create `.github/workflows/supply-chain-check.yml`:

```yaml
name: Supply Chain Check
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Audit
        run: npm audit
      - name: Lockfile lint
        run: npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https
      - name: Audit signatures
        run: npm audit signatures
```

Adapt for the detected package manager.

## Verification

After making changes, summarise what was created/updated and remind the user to:
1. Review the changes
2. Commit the new config files
3. Restart Claude Code if hooks need to pick up new `.npmrc` settings
```

- [ ] **Step 2: Commit**

```bash
git add plugins/supply-chain-defence/skills/harden/SKILL.md
git commit -m "feat(supply-chain-defence): add harden skill for config file generation"
```

---

### Task 25: Audit Skill

**Files:**
- Create: `plugins/supply-chain-defence/skills/audit/SKILL.md`

- [ ] **Step 1: Write audit SKILL.md**

Write to `plugins/supply-chain-defence/skills/audit/SKILL.md`:

```markdown
---
name: supply-chain-defence:audit
description: >-
  This skill should be used when the user asks to "audit dependencies",
  "run security audit", "check for vulnerabilities", "supply chain report",
  "security posture", "audit npm packages", "check dependency security",
  or "generate SBOM". Runs a comprehensive security posture report using
  npm audit, lockfile-lint, Socket.dev, and dependency age analysis.
  Cross-references devs:deps-core for package manager commands.
---

# Supply Chain Security Audit

Run a comprehensive security audit of the project's dependencies. This skill orchestrates multiple tools and presents a unified report.

## Prerequisites

Run `/supply-chain-defence:doctor` first to ensure required tools are installed.

## Detect Package Manager

Use the same lockfile detection as `devs:deps-core`:

| Lock file | Package manager |
|---|---|
| `pnpm-lock.yaml` | pnpm |
| `package-lock.json` | npm |
| `yarn.lock` | yarn |

## Audit Steps

### 1. npm/pnpm Audit

Run the appropriate audit command (refer to `devs:deps-core` for exact commands):

- npm: `npm audit --json`
- pnpm: `pnpm audit --json`
- yarn: `yarn npm audit --json`

Parse the JSON output and summarise vulnerabilities by severity (critical, high, moderate, low).

### 2. lockfile-lint

Run lockfile-lint validation:

```bash
npx lockfile-lint --path <lockfile> --type <pm> --allowed-hosts npm --validate-https
```

Report any failures (non-https sources, unexpected hosts).

### 3. Socket.dev Scan (if available)

If `socket` CLI is available, run:

```bash
socket report create --json
```

Summarise the risk findings.

### 4. Dependency Age Analysis

For each direct dependency in `package.json`, check the publish date of the installed version:

```bash
npm view <package>@<version> time --json
```

Flag any dependency where the installed version was published within the last 5 days.

### 5. Maintainer Analysis

For top-level dependencies, check maintainer count:

```bash
npm view <package> maintainers --json
```

Flag single-maintainer packages with high download counts as higher risk (these are prime targets for account takeover attacks like the Axios incident).

### 6. SBOM Generation (Optional)

If `@cyclonedx/cyclonedx-npm` is installed and the user wants an SBOM, offer to generate:

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

## Report Format

Present findings as a structured report:

```
## Supply Chain Security Report

### Vulnerabilities (npm audit)
- X critical, Y high, Z moderate

### Lockfile Integrity
- PASS/FAIL with details

### Socket.dev Findings
- Risk summary or "Socket CLI not available"

### Recently Published Dependencies
- List any deps published in last 5 days

### High-Risk Maintainer Patterns
- List single-maintainer packages with >100k weekly downloads

### Recommendations
- Prioritised list of actions
```
```

- [ ] **Step 2: Commit**

```bash
git add plugins/supply-chain-defence/skills/audit/SKILL.md
git commit -m "feat(supply-chain-defence): add audit skill for comprehensive security posture report"
```

---

## Phase 9: Commands

### Task 26: Doctor Command

**Files:**
- Create: `plugins/supply-chain-defence/commands/doctor.md`

- [ ] **Step 1: Write doctor.md**

Write to `plugins/supply-chain-defence/commands/doctor.md`:

```markdown
---
name: supply-chain-defence:doctor
description: "Diagnose whether the supply chain defence toolchain is ready. Checks for required tools (Socket.dev, lockfile-lint, Node.js) and plugin script sync status. Use --auto-fix to automatically install missing tools."
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
  - Skill
argument-hint: "[--auto-fix]"
---

# Supply Chain Defence Doctor

Diagnose the supply chain defence toolchain. Focused on **tool availability**, not project configuration.

## Step 1: Parse Arguments

Check if `$ARGUMENTS` contains `--auto-fix`. Store as a boolean flag.

## Step 2: Run Doctor Checks

Run the check runner with the doctor profile:

```bash
node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile doctor
```

The runner outputs JSON with a `results` array. Each result has `status` (pass/warn/info) and `message`.

## Step 3: Present Results

Format results into three categories:

**Ready:**
- All checks with status `pass`

**Missing (fixable):**
- Socket.dev CLI not installed
- lockfile-lint not installed
- Scripts not synced

**Optional:**
- CycloneDX not installed
- jq not installed

Present as a table:

```
## Supply Chain Defence — Doctor Report

| Tool | Status | Notes |
|------|--------|-------|
| Node.js | PASS | v20.11.0 |
| Package Manager | PASS | pnpm (from pnpm-lock.yaml) |
| Socket.dev CLI | MISSING | Install: npm install -g @socketsecurity/cli |
| lockfile-lint | PASS | v5.0.0 |
| CycloneDX | OPTIONAL | Not installed (SBOM generation) |
| jq | OPTIONAL | Not installed |
| Script Sync | PASS | version 0.1.0 |
```

## Step 4: Remediation

**If `--auto-fix`:** Invoke `supply-chain-defence:setup` skill to install all missing required tools automatically.

**If no `--auto-fix`:** Ask the user which missing tools they'd like to install:

> "Found N missing tools. Would you like to install them? I can run /supply-chain-defence:setup to fix these, or you can choose which to install."

If the user agrees, invoke the `supply-chain-defence:setup` skill.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/supply-chain-defence/commands/doctor.md
git commit -m "feat(supply-chain-defence): add doctor command for toolchain diagnostics"
```

---

### Task 27: Review Command

**Files:**
- Create: `plugins/supply-chain-defence/commands/review.md`

- [ ] **Step 1: Write review.md**

Write to `plugins/supply-chain-defence/commands/review.md`:

```markdown
---
name: supply-chain-defence:review
description: "Deep dive security review of a specific npm package, project directory, package.json, or lockfile. Checks registry metadata, provenance, maintainer history, typosquatting risk, lifecycle scripts, and dependency tree."
allowed-tools:
  - Bash
  - Read
  - Glob
  - WebFetch
  - WebSearch
argument-hint: "<package-name|file-path|directory>"
---

# Supply Chain Defence Review

Deep security review of a package or project.

## Step 1: Parse Input

Determine what `$ARGUMENTS` refers to:

1. **Package name** (e.g., `lodash`, `@scope/pkg`) — no `/` prefix, no file extension, or starts with `@`
2. **File path** (e.g., `./package.json`, `./pnpm-lock.yaml`) — ends with `.json` or `.yaml` or `.lock`
3. **Directory** (e.g., `./packages/api/`) — path exists and is a directory

If no arguments provided, default to the current working directory.

## Step 2: For a Package Name

Run the review checks via the runner:

```bash
echo '{"tool_input":{"command":"npm install <package>"},"cwd":"<cwd>"}' | node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile review
```

Additionally, gather information using Bash commands:

### Registry Metadata
```bash
npm view <package> --json
```
Extract and report: version count, publish dates, latest version, license.

### Download Stats
```bash
npm view <package> --json
```
Check weekly downloads. Flag if very low (<100/week) or if there's a sudden recent spike.

### Provenance
```bash
npm audit signatures
```
Check if the package has npm provenance attestation.

### Maintainer Info
```bash
npm view <package> maintainers --json
```
Report maintainer count. Flag single-maintainer packages.

### Lifecycle Scripts
```bash
npm view <package> scripts --json
```
Flag `preinstall`, `postinstall`, `install`, `prepare` scripts.

### Dependency Tree
```bash
npm view <package> dependencies --json
```
Report direct dependency count. Flag unusually large trees.

### Socket.dev (if available)
```bash
socket npm info <package>
```

### npmscan.com
Search for the package on npmscan.com for malware indicators.

## Step 3: For a Directory or File

Read the `package.json` (directly or from the directory). Extract all dependency names from `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.

For each dependency, run the package review checks from Step 2.

Additionally run:
- `lockfile-lint` on the lockfile
- Dependency age analysis (flag anything published in last 5 days)
- Bulk typosquatting check

## Step 4: Present Report

Format as a structured report:

```
## Supply Chain Review: <target>

### Overview
- Package count: N
- Total transitive deps: M

### Risk Findings
- [HIGH] Package "X" has a single maintainer and 50M weekly downloads
- [WARN] Package "Y" was published 2 days ago
- [WARN] Package "Z" has postinstall script

### Typosquatting Check
- No suspects found / List suspects

### Provenance
- N/M packages have provenance attestation

### Recommendations
- Prioritised action list
```
```

- [ ] **Step 2: Commit**

```bash
git add plugins/supply-chain-defence/commands/review.md
git commit -m "feat(supply-chain-defence): add review command for deep package/project security analysis"
```

---

## Phase 10: README

### Task 28: README

**Files:**
- Create: `plugins/supply-chain-defence/README.md`

- [ ] **Step 1: Write README.md**

Write to `plugins/supply-chain-defence/README.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add plugins/supply-chain-defence/README.md
git commit -m "docs(supply-chain-defence): add README with usage guide"
```

---

## Phase 11: Verification

### Task 29: End-to-End Verification

- [ ] **Step 1: Verify complete directory structure**

Run: `find plugins/supply-chain-defence -type f | sort`

Expected output should list all files created in previous tasks:
- `.claude-plugin/plugin.json`
- `.claude-plugin/extends-plugin.json`
- `README.md`
- `hooks/hooks.json`
- `skills/setup/SKILL.md`
- `skills/harden/SKILL.md`
- `skills/audit/SKILL.md`
- `commands/doctor.md`
- `commands/review.md`
- `scripts/VERSION`
- `scripts/sync.sh`
- `scripts/runner.js`
- `scripts/config.json`
- `scripts/data/popular-packages.json`
- All `scripts/checks/*.js` files

- [ ] **Step 2: Verify all JSON files parse correctly**

Run: `find plugins/supply-chain-defence -name "*.json" -exec sh -c 'python3 -m json.tool "$1" > /dev/null && echo "OK: $1"' _ {} \;`

Expected: All files report OK.

- [ ] **Step 3: Verify all JS files have valid syntax**

Run: `find plugins/supply-chain-defence -name "*.js" -exec sh -c 'node --check "$1" && echo "OK: $1"' _ {} \;`

Expected: All files report OK.

- [ ] **Step 4: Verify hooks.json references valid profiles**

Run: `node -e "const h=require('./plugins/supply-chain-defence/hooks/hooks.json'); const c=require('./plugins/supply-chain-defence/scripts/config.json'); const profiles=new Set(Object.keys(c.profiles)); const referenced=[]; JSON.stringify(h).replace(/--profile (\w[\w-]*)/g, (m,p) => { referenced.push(p) }); const missing=referenced.filter(p=>!profiles.has(p)); console.log(missing.length ? 'MISSING: '+missing.join(', ') : 'All profiles valid')"`

Expected: `All profiles valid`

- [ ] **Step 5: Verify all checks referenced in profiles exist as files**

Run: `node -e "const c=require('./plugins/supply-chain-defence/scripts/config.json'); const fs=require('fs'); const checks=new Set(); for(const p of Object.values(c.profiles)) p.forEach(ch=>checks.add(ch)); const missing=[...checks].filter(ch=>!fs.existsSync('plugins/supply-chain-defence/scripts/checks/'+ch+'.js')); console.log(missing.length ? 'MISSING: '+missing.join(', ') : 'All checks have files')"`

Expected: `All checks have files`

- [ ] **Step 6: Final commit if any files were adjusted**

```bash
git status
# If clean, no commit needed. If there are fixes:
git add -A plugins/supply-chain-defence/
git commit -m "fix(supply-chain-defence): verification fixes"
```
