# Supply Chain Defence: Snags Fix-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all `execSync` usage, deduplicate utilities, reconcile version tracking, add bun audit support, and provide comprehensive bun lifecycle coverage including lockfile migration guidance.

**Architecture:** Surgical file-by-file changes across the supply-chain-defence plugin. No new abstractions — each `execSync` is mechanically converted to `spawnSync`. New bun checks follow the existing check pattern (export an async function, return `{status, message, details}`). Configuration and hook changes are additive.

**Tech Stack:** Node.js (child_process.spawnSync), node:test, bash (sync.sh)

**Spec:** `docs/superpowers/specs/2026-04-08-supply-chain-snags-design.md`

---

### Task 1: Extract `levenshtein()` to `utils.js`

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/utils.js:122`
- Modify: `plugins/supply-chain-defence/scripts/checks/typosquat-local.js:6-21`
- Modify: `plugins/supply-chain-defence/scripts/checks/typosquat-bulk.js:6-21`
- Test: `plugins/supply-chain-defence/tests/utils.test.js`

- [ ] **Step 1: Write the failing test for levenshtein in utils**

Add to the end of `tests/utils.test.js`:

```js
describe("levenshtein", () => {
  const { levenshtein } = require("../scripts/utils");

  it("returns 0 for identical strings", () => {
    assert.strictEqual(levenshtein("abc", "abc"), 0);
  });

  it("returns length for empty vs non-empty", () => {
    assert.strictEqual(levenshtein("", "abc"), 3);
    assert.strictEqual(levenshtein("abc", ""), 3);
  });

  it("returns 1 for single substitution", () => {
    assert.strictEqual(levenshtein("cat", "car"), 1);
  });

  it("returns 1 for single insertion", () => {
    assert.strictEqual(levenshtein("cat", "cats"), 1);
  });

  it("returns 1 for single deletion", () => {
    assert.strictEqual(levenshtein("cats", "cat"), 1);
  });

  it("returns correct distance for typosquat examples", () => {
    assert.strictEqual(levenshtein("axois", "axios"), 2);
    assert.strictEqual(levenshtein("chalkk", "chalk"), 1);
    assert.strictEqual(levenshtein("loadash", "lodash"), 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/supply-chain-defence && node --test tests/utils.test.js 2>&1 | tail -20`
Expected: FAIL — `levenshtein` is not exported from `../scripts/utils`

- [ ] **Step 3: Add `levenshtein` to `utils.js`**

Add before the `module.exports` line at the end of `scripts/utils.js`:

```js
/**
 * Levenshtein edit distance between two strings.
 */
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
```

Update the exports:

```js
module.exports = { npmView, extractPackageNames, isValidPackageName, levenshtein };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/supply-chain-defence && node --test tests/utils.test.js 2>&1 | tail -20`
Expected: All tests PASS including new `levenshtein` tests

- [ ] **Step 5: Remove local `levenshtein` from both typosquat files**

In `scripts/checks/typosquat-local.js`:
- Change line 5 from `const { extractPackageNames } = require("../utils");` to `const { extractPackageNames, levenshtein } = require("../utils");`
- Delete lines 6-21 (the local `levenshtein` function)

In `scripts/checks/typosquat-bulk.js`:
- Add `const { levenshtein } = require("../utils");` after the existing requires (line 3)
- Delete lines 6-21 (the local `levenshtein` function)

- [ ] **Step 6: Run all tests to verify nothing broke**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js tests/utils.test.js 2>&1 | tail -30`
Expected: All tests PASS — typosquat checks still use the same function, just from a different location

- [ ] **Step 7: Commit**

```bash
git add plugins/supply-chain-defence/scripts/utils.js plugins/supply-chain-defence/scripts/checks/typosquat-local.js plugins/supply-chain-defence/scripts/checks/typosquat-bulk.js plugins/supply-chain-defence/tests/utils.test.js
git commit -m "refactor(supply-chain-defence): extract levenshtein() to utils.js

Deduplicate the identical Levenshtein distance function from
typosquat-local.js and typosquat-bulk.js into the shared utils module."
```

---

### Task 2: Convert Pattern 4 — static version-check files to `spawnSync`

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/checks/node-version.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/socket-installed.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/socket-present.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/jq-installed.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/lockfile-lint-installed.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/cyclonedx-installed.js`

These 6 files follow the same pattern: `execSync("tool --version", ...)` inside a try/catch. Convert each to `spawnSync` with `result.status !== 0 || result.error` checking instead of try/catch.

- [ ] **Step 1: Convert `node-version.js`**

Replace the entire file content:

```js
"use strict";
const { spawnSync } = require("child_process");

module.exports = async function nodeVersion(input, state, config, cwd) {
  const result = spawnSync("node", ["--version"], {
    stdio: "pipe", timeout: 5000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "warn",
      message: "Node.js not found",
      details: {},
    };
  }
  const version = result.stdout.trim();
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
};
```

- [ ] **Step 2: Convert `socket-installed.js`**

Replace the entire file content:

```js
"use strict";
const { spawnSync } = require("child_process");

module.exports = async function socketInstalled(input, state, config, cwd) {
  const result = spawnSync("socket", ["--version"], {
    stdio: "pipe", timeout: 5000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "warn",
      message: "Socket.dev CLI not installed. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }
  return {
    status: "pass",
    message: `Socket.dev CLI ${result.stdout.trim()}`,
    details: { version: result.stdout.trim() },
  };
};
```

- [ ] **Step 3: Convert `socket-present.js`**

Replace the entire file content:

```js
"use strict";
const { spawnSync } = require("child_process");

module.exports = async function socketPresent(input, state, config, cwd) {
  const result = spawnSync("socket", ["--version"], {
    cwd,
    stdio: "pipe",
    timeout: 5000,
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "block",
      message:
        "Socket.dev CLI is not installed or not in PATH. Socket provides real-time malware and typosquatting detection. Install with: npm install -g @socketsecurity/cli — or run /supply-chain-defence:doctor --auto-fix",
      details: { key: "_" },
    };
  }
  return {
    status: "pass",
    message: "Socket.dev CLI is installed",
    details: {},
  };
};
```

- [ ] **Step 4: Convert `jq-installed.js`**

Replace the entire file content:

```js
"use strict";
const { spawnSync } = require("child_process");

module.exports = async function jqInstalled(input, state, config, cwd) {
  const result = spawnSync("jq", ["--version"], {
    stdio: "pipe", timeout: 5000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "info",
      message: "jq not installed (optional — used by some advanced checks)",
      details: {},
    };
  }
  return {
    status: "pass",
    message: "jq available",
    details: {},
  };
};
```

- [ ] **Step 5: Convert `lockfile-lint-installed.js`**

Replace the entire file content:

```js
"use strict";
const { spawnSync } = require("child_process");

module.exports = async function lockfileLintInstalled(input, state, config, cwd) {
  const result = spawnSync("npx", ["lockfile-lint", "--version"], {
    stdio: "pipe", timeout: 10000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "warn",
      message: "lockfile-lint not installed. Install: npm install -g lockfile-lint",
      details: {},
    };
  }
  return {
    status: "pass",
    message: `lockfile-lint ${result.stdout.trim()}`,
    details: { version: result.stdout.trim() },
  };
};
```

- [ ] **Step 6: Convert `cyclonedx-installed.js`**

Replace the entire file content:

```js
"use strict";
const { spawnSync } = require("child_process");

module.exports = async function cyclonedxInstalled(input, state, config, cwd) {
  const result = spawnSync("npx", ["@cyclonedx/cyclonedx-npm", "--version"], {
    stdio: "pipe", timeout: 10000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "info",
      message: "CycloneDX npm not installed (optional — for SBOM generation)",
      details: {},
    };
  }
  return {
    status: "pass",
    message: "CycloneDX npm (SBOM generation) available",
    details: {},
  };
};
```

- [ ] **Step 7: Run doctor profile tests to verify**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All existing tests PASS

- [ ] **Step 8: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/node-version.js plugins/supply-chain-defence/scripts/checks/socket-installed.js plugins/supply-chain-defence/scripts/checks/socket-present.js plugins/supply-chain-defence/scripts/checks/jq-installed.js plugins/supply-chain-defence/scripts/checks/lockfile-lint-installed.js plugins/supply-chain-defence/scripts/checks/cyclonedx-installed.js
git commit -m "security(supply-chain-defence): convert version-check scripts from execSync to spawnSync

Mechanical conversion of 6 version-check files. No shell is invoked —
all arguments are passed as arrays to spawnSync."
```

---

### Task 3: Convert Pattern 3 — git commands to `spawnSync`

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/checks/lockfile-drift.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/npmrc-changed.js`

- [ ] **Step 1: Convert `lockfile-drift.js`**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
];

module.exports = async function lockfileDrift(input, state, config, cwd) {
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

  const opts = { cwd, stdio: "pipe", timeout: 5000, encoding: "utf8" };

  const diff = spawnSync("git", ["diff", "--name-only", "--", lockfile], opts);
  if (diff.error || diff.status === null) {
    return {
      status: "info",
      message: "Could not check lockfile drift — not a git repository or git unavailable",
      details: {},
    };
  }

  const stagedDiff = spawnSync("git", ["diff", "--cached", "--name-only", "--", lockfile], opts);

  const hasChanges =
    (diff.stdout || "").trim().length > 0 ||
    (stagedDiff.stdout || "").trim().length > 0;

  if (!hasChanges) {
    return {
      status: "pass",
      message: `${lockfile} has no uncommitted changes`,
      details: {},
    };
  }

  const stat = spawnSync("git", ["diff", "--stat", "--", lockfile], opts);
  const summary = (stat.status === 0 && stat.stdout)
    ? stat.stdout.trim()
    : "Could not get diff summary";

  return {
    status: "warn",
    message: `${lockfile} has uncommitted changes. This may indicate unexpected dependency modifications:\n${summary}`,
    details: { lockfile, summary },
  };
};
```

Note: This also updates `bun.lockb` to `bun.lock` in the LOCKFILES array (spec section 5b).

- [ ] **Step 2: Convert `npmrc-changed.js`**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = async function npmrcChanged(input, state, config, cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");

  if (!fs.existsSync(npmrcPath)) {
    return {
      status: "warn",
      message: ".npmrc was deleted. Project no longer has npm security configuration.",
      details: {},
    };
  }

  const opts = { cwd, stdio: "pipe", timeout: 5000, encoding: "utf8" };

  const diff = spawnSync("git", ["diff", "--", ".npmrc"], opts);
  if (diff.error || diff.status === null) {
    return {
      status: "info",
      message: ".npmrc change detected — not a git repository, cannot diff.",
      details: {},
    };
  }

  const hasDiff = (diff.stdout || "").trim().length > 0;

  if (!hasDiff) {
    const stagedDiff = spawnSync("git", ["diff", "--cached", "--", ".npmrc"], opts);
    const hasStaged = (stagedDiff.stdout || "").trim().length > 0;

    if (!hasStaged) {
      return {
        status: "pass",
        message: ".npmrc has no uncommitted changes",
        details: {},
      };
    }
  }

  // Check if security-relevant settings were removed or weakened
  const content = fs.readFileSync(npmrcPath, "utf8");
  const concerns = [];

  if (!/ignore-scripts\s*=\s*true/.test(content)) {
    concerns.push("ignore-scripts is not set to true");
  }
  if (!/strict-ssl\s*=\s*true/.test(content)) {
    concerns.push("strict-ssl is not set to true");
  }
  if (/ignore-scripts\s*=\s*false/.test(content)) {
    concerns.push("ignore-scripts was set to false — lifecycle scripts will run on install");
  }

  if (concerns.length > 0) {
    return {
      status: "warn",
      message:
        ".npmrc was modified. Security concerns:\n" +
        concerns.map((c) => `- ${c}`).join("\n"),
      details: { concerns },
    };
  }

  return {
    status: "info",
    message: ".npmrc was modified but security settings appear intact.",
    details: {},
  };
};
```

- [ ] **Step 3: Run tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/lockfile-drift.js plugins/supply-chain-defence/scripts/checks/npmrc-changed.js
git commit -m "security(supply-chain-defence): convert git commands from execSync to spawnSync

lockfile-drift.js and npmrc-changed.js now use spawnSync with array
arguments — no shell quoting needed. Also updates bun.lockb to bun.lock
in lockfile-drift.js."
```

---

### Task 4: Convert Pattern 2 — shell-redirect files to `spawnSync`

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/checks/dependency-tree.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/socket-scan.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/provenance-check.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/npm-audit.js`

- [ ] **Step 1: Convert `dependency-tree.js`**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LS_COMMANDS = {
  npm: ["npm", ["ls", "--all", "--json"]],
  pnpm: ["pnpm", ["ls", "--depth", "Infinity", "--json"]],
  yarn: ["yarn", ["info", "--all", "--json"]],
};

function countDeps(tree) {
  const seen = new Set();
  function walk(node) {
    const deps = node.dependencies || {};
    for (const [name, info] of Object.entries(deps)) {
      const key = `${name}@${info.version || "unknown"}`;
      if (!seen.has(key)) {
        seen.add(key);
        walk(info);
      }
    }
  }
  walk(tree);
  return seen.size;
}

module.exports = async function dependencyTree(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const pm = state.detectedPackageManager || "npm";
  const cmdEntry = LS_COMMANDS[pm] || LS_COMMANDS.npm;

  if (!cmdEntry) {
    return {
      status: "info",
      message: `Dependency tree analysis not supported for ${pm}. Run \`${pm === "bun" ? "bun pm ls --all" : pm + " ls"}\` manually.`,
      details: {},
    };
  }

  const result = spawnSync(cmdEntry[0], cmdEntry[1], {
    cwd,
    stdio: ["pipe", "pipe", "ignore"],
    timeout: 30000,
    encoding: "utf8",
  });

  if (result.error || (result.status !== 0 && !result.stdout)) {
    return {
      status: "info",
      message: `Could not analyze dependency tree: ${result.error?.message || "command failed"}`,
      details: {},
    };
  }

  let tree;
  try {
    tree = JSON.parse(result.stdout);
    // pnpm returns an array
    if (Array.isArray(tree)) tree = tree[0] || {};
  } catch {
    return {
      status: "info",
      message: "Dependency tree output not parseable",
      details: {},
    };
  }

  const directDeps = Object.keys(tree.dependencies || {}).length;
  const totalDeps = countDeps(tree);

  const concerns = [];
  if (totalDeps > 500) {
    concerns.push(`Large dependency tree (${totalDeps} total packages) increases attack surface`);
  }
  if (totalDeps > 1000) {
    concerns.push("Consider auditing whether all dependencies are necessary");
  }

  return {
    status: concerns.length > 0 ? "warn" : "pass",
    message:
      `Dependency tree: ${directDeps} direct, ${totalDeps} total (including transitive)` +
      (concerns.length > 0 ? "\n" + concerns.join("\n") : ""),
    details: { directDeps, totalDeps, concerns },
  };
};
```

- [ ] **Step 2: Convert `socket-scan.js`**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function socketScan(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  // Check if socket CLI is available
  const versionCheck = spawnSync("socket", ["--version"], {
    cwd, stdio: "pipe", timeout: 5000,
  });
  if (versionCheck.status !== 0 || versionCheck.error) {
    return {
      status: "info",
      message: "Socket.dev CLI not available — skipping scan. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }

  const result = spawnSync("socket", ["report", "create", "--json"], {
    cwd,
    stdio: ["pipe", "pipe", "ignore"],
    timeout: 60000,
    encoding: "utf8",
  });

  if (result.error || (result.status !== 0 && !result.stdout)) {
    const stderr = (result.stderr || "").toString();
    if (stderr.includes("auth") || stderr.includes("login") || stderr.includes("API key")) {
      return {
        status: "info",
        message: "Socket.dev CLI requires authentication. Visit https://socket.dev to configure your API key.",
        details: {},
      };
    }
    return {
      status: "info",
      message: "Socket scan failed: " + (stderr.slice(0, 200) || result.error?.message || "unknown error"),
      details: {},
    };
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return {
      status: "pass",
      message: "Socket scan completed (output not parseable as JSON)",
      details: { raw: (result.stdout || "").slice(0, 500) },
    };
  }

  // Extract issue counts if available
  const issues = report.issues || report.alerts || [];
  if (Array.isArray(issues) && issues.length > 0) {
    const critical = issues.filter((i) => i.severity === "critical" || i.severity === "high");
    const other = issues.length - critical.length;

    return {
      status: critical.length > 0 ? "warn" : "info",
      message:
        `Socket scan found ${issues.length} issues` +
        (critical.length > 0 ? ` (${critical.length} critical/high)` : "") +
        (other > 0 ? `, ${other} other` : "") +
        ". Run `socket report create` for full details.",
      details: { total: issues.length, critical: critical.length },
    };
  }

  return {
    status: "pass",
    message: "Socket scan: no issues found",
    details: {},
  };
};
```

- [ ] **Step 3: Convert `provenance-check.js`**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function provenanceCheck(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  // npm audit signatures requires a lockfile
  const hasLockfile =
    fs.existsSync(path.join(cwd, "package-lock.json")) ||
    fs.existsSync(path.join(cwd, "npm-shrinkwrap.json"));

  if (!hasLockfile) {
    return {
      status: "info",
      message: "npm audit signatures requires package-lock.json — skipping provenance check",
      details: {},
    };
  }

  const result = spawnSync("npm", ["audit", "signatures"], {
    cwd,
    stdio: "pipe",
    timeout: 30000,
    encoding: "utf8",
  });

  // Combine stdout and stderr (npm audit signatures writes to both)
  const output = ((result.stdout || "") + "\n" + (result.stderr || "")).trim();

  if (result.error) {
    return {
      status: "info",
      message: "Provenance check could not run: " + (result.error.message || "unknown error"),
      details: {},
    };
  }

  // Parse output for signature status
  const verified = output.match(/(\d+) packages have verified/);
  const missing = output.match(/(\d+) packages have missing/);
  const invalid = output.match(/(\d+) packages have invalid/);

  const verifiedCount = verified ? parseInt(verified[1], 10) : 0;
  const missingCount = missing ? parseInt(missing[1], 10) : 0;
  const invalidCount = invalid ? parseInt(invalid[1], 10) : 0;

  if (invalidCount > 0) {
    return {
      status: "warn",
      message:
        `Provenance check: ${invalidCount} packages have INVALID signatures. ` +
        `${verifiedCount} verified, ${missingCount} missing. ` +
        "Invalid signatures may indicate tampering. Run `npm audit signatures` for details.",
      details: { verified: verifiedCount, missing: missingCount, invalid: invalidCount },
    };
  }

  if (missingCount > 0) {
    return {
      status: "info",
      message:
        `Provenance check: ${verifiedCount} verified, ${missingCount} without provenance. ` +
        "Packages without provenance were published manually (not via CI/CD).",
      details: { verified: verifiedCount, missing: missingCount, invalid: 0 },
    };
  }

  if (verifiedCount > 0) {
    return {
      status: "pass",
      message: `Provenance check: ${verifiedCount} packages have verified signatures`,
      details: { verified: verifiedCount, missing: 0, invalid: 0 },
    };
  }

  // No parseable output but no error either
  return {
    status: "info",
    message: "Provenance check could not run: " + (output.slice(0, 200) || "no output"),
    details: {},
  };
};
```

- [ ] **Step 4: Convert `npm-audit.js` (includes bun support)**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const AUDIT_COMMANDS = {
  npm: ["npm", ["audit", "--json"]],
  pnpm: ["pnpm", ["audit", "--json"]],
  yarn: ["yarn", ["npm", "audit", "--json"]],
  bun: ["bun", ["audit", "--json"]],
};

module.exports = async function npmAudit(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const pm = state.detectedPackageManager || "npm";
  const cmdEntry = AUDIT_COMMANDS[pm] || AUDIT_COMMANDS.npm;

  const result = spawnSync(cmdEntry[0], cmdEntry[1], {
    cwd,
    stdio: "pipe",
    timeout: 60000,
    encoding: "utf8",
  });

  // Exit code 0 means no vulnerabilities
  if (result.status === 0) {
    return {
      status: "pass",
      message: `${pm} audit: no vulnerabilities found`,
      details: {},
    };
  }

  const stdout = result.stdout || "";

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
};
```

- [ ] **Step 5: Run tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/dependency-tree.js plugins/supply-chain-defence/scripts/checks/socket-scan.js plugins/supply-chain-defence/scripts/checks/provenance-check.js plugins/supply-chain-defence/scripts/checks/npm-audit.js
git commit -m "security(supply-chain-defence): convert shell-redirect scripts from execSync to spawnSync

dependency-tree.js, socket-scan.js, provenance-check.js, npm-audit.js
now use spawnSync with array args. Shell redirections replaced by stdio
configuration. Also adds bun audit --json support to npm-audit.js."
```

---

### Task 5: Convert Pattern 1 — `lockfile-integrity.js` (security fix)

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/checks/lockfile-integrity.js`

This is the only file with shell-interpolated untrusted input — the highest priority fix.

- [ ] **Step 1: Convert `lockfile-integrity.js`**

Replace the entire file content:

```js
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function detectLockfile(cwd) {
  const lockfiles = [
    { file: "pnpm-lock.yaml", type: "pnpm" },
    { file: "package-lock.json", type: "npm" },
    { file: "yarn.lock", type: "yarn" },
    { file: "bun.lock", type: "bun" },
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

  const versionCheck = spawnSync("npx", ["lockfile-lint", "--version"], {
    cwd,
    stdio: "pipe",
    timeout: 10000,
  });
  if (versionCheck.status !== 0 || versionCheck.error) {
    return {
      status: "warn",
      message:
        "lockfile-lint not available. Install with: npm install -g lockfile-lint",
      details: {},
    };
  }

  const result = spawnSync(
    "npx",
    ["lockfile-lint", "--path", lockfile.file, "--type", lockfile.type, "--allowed-hosts", "npm", "--validate-https"],
    { cwd, stdio: "pipe", timeout: 30000, encoding: "utf8" }
  );

  if (result.status === 0) {
    return {
      status: "pass",
      message: `Lockfile integrity check passed (${lockfile.file})`,
      details: { output: (result.stdout || "").trim() },
    };
  }

  const stderr = (result.stderr || result.stdout || "").trim();
  return {
    status: "warn",
    message: `Lockfile integrity issues found in ${lockfile.file}:\n${stderr}`,
    details: { output: stderr },
  };
};
```

Note: This also updates the lockfile detection to include `bun.lock` (spec section 5b).

- [ ] **Step 2: Run tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 3: Verify no `execSync` remains in the plugin**

Run: `grep -r "execSync" plugins/supply-chain-defence/scripts/`
Expected: No output — zero matches

- [ ] **Step 4: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/lockfile-integrity.js
git commit -m "security(supply-chain-defence): fix command injection in lockfile-integrity.js

Convert shell-interpolated execSync to spawnSync with array arguments.
The lockfile.file value was previously interpolated into a shell string.
Also adds bun.lock to lockfile detection."
```

---

### Task 6: Update `lockfile-present.js` and `package-manager.js` for `bun.lock`

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/checks/lockfile-present.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/package-manager.js`
- Test: `plugins/supply-chain-defence/tests/checks.test.js`

- [ ] **Step 1: Write failing tests for bun.lock detection**

Add to `tests/checks.test.js` inside the `package-manager` describe block (after the "prefers pnpm" test):

```js
  it("detects bun from bun.lock", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lock"), "{}");
    try {
      const state = emptyState();
      const result = await check({}, state, config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.strictEqual(result.details.pm, "bun");
      assert.strictEqual(state.detectedPackageManager, "bun");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects bun from bun.lockb (fallback)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    try {
      const state = emptyState();
      const result = await check({}, state, config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.strictEqual(result.details.pm, "bun");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
```

Add to `tests/checks.test.js` inside the `lockfile-present` describe block (after the "returns info" test):

```js
  it("detects bun.lock", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lock"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.ok(result.message.includes("bun.lock"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | grep -E "(FAIL|bun)"` 
Expected: bun.lock tests FAIL (currently only `bun.lockb` is detected)

- [ ] **Step 3: Update `package-manager.js`**

Replace the `LOCKFILE_MAP` array:

```js
const LOCKFILE_MAP = [
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "package-lock.json", pm: "npm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "bun.lock", pm: "bun" },
  { file: "bun.lockb", pm: "bun" },
];
```

- [ ] **Step 4: Update `lockfile-present.js`**

Replace the `LOCKFILES` array:

```js
const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS including new bun.lock tests

- [ ] **Step 6: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/package-manager.js plugins/supply-chain-defence/scripts/checks/lockfile-present.js plugins/supply-chain-defence/tests/checks.test.js
git commit -m "feat(supply-chain-defence): detect bun.lock as primary, bun.lockb as fallback

package-manager.js detects bun.lock first, bun.lockb as fallback.
lockfile-present.js now checks for bun.lock instead of bun.lockb."
```

---

### Task 7: Add `before-flag.js` bun support

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/checks/before-flag.js`
- Modify: `plugins/supply-chain-defence/scripts/checks/before-flag-config.js`
- Test: `plugins/supply-chain-defence/tests/checks.test.js`

- [ ] **Step 1: Write failing tests for bun bunfig.toml detection**

Add to `tests/checks.test.js` after the existing `before-flag` describe block's last test (the "handles quoted yarn duration string" test):

```js
  // --- Bun support ---

  it("passes when bunfig.toml has minimumReleaseAge >= 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    // 432000 seconds = 5 days
    fs.writeFileSync(path.join(tmpDir, "bunfig.toml"), "[install]\nminimumReleaseAge = 432000\n");
    try {
      const result = await check(
        { tool_input: { command: "bun add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks when bunfig.toml has minimumReleaseAge < 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    // 86400 seconds = 1 day
    fs.writeFileSync(path.join(tmpDir, "bunfig.toml"), "[install]\nminimumReleaseAge = 86400\n");
    try {
      const result = await check(
        { tool_input: { command: "bun add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("below the recommended minimum"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks bun add with no release age config and no --before suggestion", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const state = emptyState();
      state.detectedPackageManager = "bun";
      const result = await check(
        { tool_input: { command: "bun add lodash" } },
        state,
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("bunfig.toml"));
      // Should NOT suggest --before for bun
      assert.ok(!result.message.includes("--before"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
```

Add to `tests/checks.test.js` inside the `buildConfigInstructions` describe block:

```js
  it("puts bun first when detected", () => {
    const result = buildConfigInstructions(5, "bun");
    assert.ok(result.startsWith("This project uses bun"));
    assert.ok(result.includes("bunfig.toml"));
    assert.ok(result.includes("432000")); // 5 * 86400
  });
```

Add to `tests/checks.test.js` inside the `before-flag-config` describe block:

```js
  it("passes when bunfig.toml has minimumReleaseAge >= 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bunfig.toml"), "[install]\nminimumReleaseAge = 432000\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | grep -E "(FAIL|bun)"` 
Expected: New bun tests FAIL

- [ ] **Step 3: Add bun support to `before-flag.js`**

Add bun to the `PM_INSTRUCTIONS` object (after the yarn entry at line 29):

```js
  bun: {
    name: "bun",
    file: "bunfig.toml",
    setting: "minimumReleaseAge",
    example: (days) =>
      `Add \`minimumReleaseAge = ${days * 86400}\` under [install] in bunfig.toml (value is in seconds)`,
  },
```

Add the `getBunfigReleaseAge` function after `getYarnReleaseAge`:

```js
// Parse bunfig.toml for minimumReleaseAge (value in seconds for bun)
function getBunfigReleaseAge(cwd) {
  const bunfigPath = path.join(cwd, "bunfig.toml");
  if (!fs.existsSync(bunfigPath)) return null;
  const content = fs.readFileSync(bunfigPath, "utf8");
  const match = content.match(/minimumReleaseAge\s*=\s*(\d+)/);
  if (!match) return null;
  // Convert seconds to days
  return parseInt(match[1], 10) / 86400;
}
```

Update the `configuredAge` line in the main function:

```js
  const bunAge = getBunfigReleaseAge(cwd);
  const configuredAge = npmrcAge ?? pnpmAge ?? yarnAge ?? bunAge;
```

Update the `--before` fallback (Case 3) to not suggest `--before` for bun. Replace the final return in the function (the "Case 3: Neither setting nor --before" block). Change the message construction to conditionally include the `--before` workaround:

```js
  // --- Case 3: Neither setting nor --before ---
  const suggestedDate = new Date(Date.now() - minDays * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  const baseMessage =
    `No release age protection configured.\n\n` +
    `Why this matters: while high-profile attacks are caught quickly, many malicious packages go ` +
    `undetected for days or weeks. In 2025 alone, over 450,000 malicious npm packages were published. ` +
    `A ${minDays}-day minimum gives security tools and the community time to flag threats before ` +
    `they reach your project.\n\n` +
    `Configuring a minimum release age in your package manager's settings is strongly preferred ` +
    `as it protects all installs automatically.\n\n` +
    configInstructions;

  // bun does not support --before
  const beforeWorkaround = detectedPm === "bun"
    ? ""
    : `\nAs a workaround for this specific command, you can add \`--before ${suggestedDate}\` — ` +
      `but this only applies to a single install and must be repeated each time.`;

  return {
    status: "block",
    message: baseMessage + beforeWorkaround,
    details: { key: "no-release-age-configured", suggestedDate },
  };
```

Update the exports at the bottom of the file to include `getBunfigReleaseAge`:

```js
if (require.main !== module) {
  module.exports.getNpmrcReleaseAge = getNpmrcReleaseAge;
  module.exports.getPnpmReleaseAge = getPnpmReleaseAge;
  module.exports.getYarnReleaseAge = getYarnReleaseAge;
  module.exports.getBunfigReleaseAge = getBunfigReleaseAge;
  module.exports.parseDurationToDays = parseDurationToDays;
  module.exports.getBeforeDate = getBeforeDate;
  module.exports.daysAgo = daysAgo;
  module.exports.buildConfigInstructions = buildConfigInstructions;
}
```

- [ ] **Step 4: Update `before-flag-config.js` to include bun**

Replace the entire file:

```js
"use strict";

const {
  getNpmrcReleaseAge,
  getPnpmReleaseAge,
  getYarnReleaseAge,
  getBunfigReleaseAge,
} = require("./before-flag");

module.exports = async function beforeFlagConfig(input, state, config, cwd) {
  const npmrcAge = getNpmrcReleaseAge(cwd);
  const pnpmAge = getPnpmReleaseAge(cwd);
  const yarnAge = getYarnReleaseAge(cwd);
  const bunAge = getBunfigReleaseAge(cwd);
  const configuredAge = npmrcAge ?? pnpmAge ?? yarnAge ?? bunAge;

  if (configuredAge === null) {
    return {
      status: "warn",
      message:
        "No release age gating configured in any package manager config. " +
        "Add min-release-age to .npmrc, minimumReleaseAge to pnpm-workspace.yaml, " +
        "npmMinimumReleaseAge to .yarnrc.yml, or minimumReleaseAge under [install] in bunfig.toml.",
      details: {},
    };
  }

  const minDays = config.thresholds.beforeFlagDays || 5;
  if (configuredAge >= minDays) {
    return {
      status: "pass",
      message: `Release age gating configured (${configuredAge} days)`,
      details: { configuredAge },
    };
  }

  return {
    status: "warn",
    message:
      `Release age gating set to ${configuredAge} days, below recommended minimum of ${minDays} days.`,
    details: { configuredAge, minDays },
  };
};
```

- [ ] **Step 5: Run tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS including new bun tests

- [ ] **Step 6: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/before-flag.js plugins/supply-chain-defence/scripts/checks/before-flag-config.js plugins/supply-chain-defence/tests/checks.test.js
git commit -m "feat(supply-chain-defence): add bun release age support via bunfig.toml

before-flag.js now reads minimumReleaseAge from bunfig.toml and
includes bun in PM_INSTRUCTIONS. --before workaround is omitted for
bun since it doesn't support that flag. before-flag-config.js also
checks bunfig.toml."
```

---

### Task 8: Create `bun-lockb-detected.js` check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/bun-lockb-detected.js`
- Test: `plugins/supply-chain-defence/tests/checks.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/checks.test.js`:

```js
// ---------------------------------------------------------------------------
// bun-lockb-detected
// ---------------------------------------------------------------------------
describe("bun-lockb-detected", () => {
  const check = require("../scripts/checks/bun-lockb-detected");

  it("passes when no bun.lockb exists", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns when bun.lockb exists without bunfig setting", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("unsupported"));
      assert.ok(result.message.includes("Bun 1.2 (January 2025)"));
      assert.ok(result.message.includes("--save-text-lockfile"));
      assert.ok(result.message.includes("Delete bun.lockb"));
      // Should NOT mention bunfig.toml removal
      assert.ok(!result.message.includes("Remove the"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns with bunfig removal step when saveBinaryLockfile is set", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    fs.writeFileSync(
      path.join(tmpDir, "bunfig.toml"),
      "[install]\nsaveBinaryLockfile = true\n"
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("saveBinaryLockfile"));
      assert.ok(result.message.includes("Remove the"));
      assert.ok(result.message.includes("--save-text-lockfile"));
      assert.ok(result.message.includes("Delete bun.lockb"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not warn when saveBinaryLockfile is false", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    fs.writeFileSync(
      path.join(tmpDir, "bunfig.toml"),
      "[install]\nsaveBinaryLockfile = false\n"
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      // Should NOT mention removing the setting (it's already false)
      assert.ok(!result.message.includes("Remove the"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | grep -E "(FAIL|bun-lockb)"` 
Expected: FAIL — module not found

- [ ] **Step 3: Create `bun-lockb-detected.js`**

```js
"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function bunLockbDetected(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "bun.lockb"))) {
    return { status: "pass", message: "No bun.lockb found", details: {} };
  }

  // Check if bunfig.toml forces binary lockfile generation
  const bunfigPath = path.join(cwd, "bunfig.toml");
  let hasSaveBinarySetting = false;
  if (fs.existsSync(bunfigPath)) {
    const content = fs.readFileSync(bunfigPath, "utf8");
    hasSaveBinarySetting = /saveBinaryLockfile\s*=\s*true/.test(content);
  }

  const preamble =
    "bun.lockb (binary lockfile) detected. This format is unsupported — " +
    "it was superseded by the text-based bun.lock format in Bun 1.2 (January 2025). " +
    "Migrate to bun.lock:";

  const suffix =
    "\nThe text format is reviewable in diffs, supported by Socket.dev, " +
    "and 30% faster for cached installs.";

  if (hasSaveBinarySetting) {
    return {
      status: "warn",
      message:
        preamble +
        "\n1. [ ] Remove the `saveBinaryLockfile` setting from bunfig.toml" +
        "\n2. [ ] Run `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`" +
        "\n3. [ ] Delete bun.lockb" +
        suffix,
      details: { hasSaveBinarySetting: true },
    };
  }

  return {
    status: "warn",
    message:
      preamble +
      "\n1. [ ] Run `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`" +
      "\n2. [ ] Delete bun.lockb" +
      suffix,
    details: { hasSaveBinarySetting: false },
  };
};
```

- [ ] **Step 4: Run tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/bun-lockb-detected.js plugins/supply-chain-defence/tests/checks.test.js
git commit -m "feat(supply-chain-defence): add bun-lockb-detected check

Warns when bun.lockb exists and provides step-by-step migration
instructions to bun.lock. Checks bunfig.toml for saveBinaryLockfile
and includes removal step if set."
```

---

### Task 9: Create `bun-gaps.js` check

**Files:**
- Create: `plugins/supply-chain-defence/scripts/checks/bun-gaps.js`
- Test: `plugins/supply-chain-defence/tests/checks.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/checks.test.js`:

```js
// ---------------------------------------------------------------------------
// bun-gaps
// ---------------------------------------------------------------------------
describe("bun-gaps", () => {
  const check = require("../scripts/checks/bun-gaps");

  it("returns info with guidance when bun is detected", async () => {
    const state = emptyState();
    state.detectedPackageManager = "bun";
    const result = await check({}, state, config, "/tmp");
    assert.strictEqual(result.status, "info");
    assert.ok(result.message.includes("Bun detected"));
    assert.ok(result.message.includes("lockfile-lint"));
    assert.ok(result.message.includes("bun pm ls"));
    assert.ok(result.message.includes("npm audit signatures"));
  });

  it("passes silently when PM is not bun", async () => {
    const state = emptyState();
    state.detectedPackageManager = "npm";
    const result = await check({}, state, config, "/tmp");
    assert.strictEqual(result.status, "pass");
  });

  it("passes silently when no PM detected", async () => {
    const result = await check({}, emptyState(), config, "/tmp");
    assert.strictEqual(result.status, "pass");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | grep -E "(FAIL|bun-gaps)"` 
Expected: FAIL — module not found

- [ ] **Step 3: Create `bun-gaps.js`**

```js
"use strict";

module.exports = async function bunGaps(input, state, config, cwd) {
  if (state.detectedPackageManager !== "bun") {
    return { status: "pass", message: "Not using bun", details: {} };
  }

  return {
    status: "info",
    message:
      "Bun detected — some supply chain checks have limited support:\n" +
      "- Lockfile integrity: lockfile-lint does not support bun.lock. Manually review bun.lock for unexpected registry URLs.\n" +
      "- Dependency tree: bun pm ls does not support --json output. Run `bun pm ls --all` and review visually.\n" +
      "- Provenance: npm audit signatures is npm-only. No bun equivalent exists — verify critical packages manually on npmjs.com.",
    details: {},
  };
};
```

- [ ] **Step 4: Run tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/supply-chain-defence/scripts/checks/bun-gaps.js plugins/supply-chain-defence/tests/checks.test.js
git commit -m "feat(supply-chain-defence): add bun-gaps check for session-start guidance

Reports bun-specific limitations at session start and in doctor output
so the agent knows what manual checks to suggest."
```

---

### Task 10: Update `config.json` profiles

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/config.json`

- [ ] **Step 1: Add `bun-lockb-detected` and `bun-gaps` to `quick` profile**

In `config.json`, add to the `quick` array (after `"typosquat-bulk"`):

```json
"bun-lockb-detected",
"bun-gaps"
```

- [ ] **Step 2: Add `bun-lockb-detected` and `bun-gaps` to `doctor` profile**

In `config.json`, add to the `doctor` array (after `"scripts-synced"`):

```json
"bun-lockb-detected",
"bun-gaps"
```

- [ ] **Step 3: Run all tests to verify config is valid**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js tests/utils.test.js 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add plugins/supply-chain-defence/scripts/config.json
git commit -m "feat(supply-chain-defence): add bun checks to quick and doctor profiles

bun-lockb-detected and bun-gaps now run at session start (quick profile)
and when doctor is invoked."
```

---

### Task 11: Update `hooks.json` for bun

**Files:**
- Modify: `plugins/supply-chain-defence/hooks/hooks.json`

- [ ] **Step 1: Add `Bash(bun *)` to PreToolUse**

In the `PreToolUse` > `Bash` matcher hooks array, add after the npx entry:

```json
{
  "type": "command",
  "if": "Bash(bun *)",
  "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile bash-guard",
  "timeout": 30
}
```

- [ ] **Step 2: Add `Bash(bun *)` to PostToolUse**

In the `PostToolUse` > `Bash` matcher hooks array, add after the npx entry:

```json
{
  "type": "command",
  "if": "Bash(bun *)",
  "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile post-install-audit",
  "async": true,
  "timeout": 180
}
```

- [ ] **Step 3: Add `bun.lock` to FileChanged matcher**

Change the existing FileChanged matcher from:
```
"package-lock.json|pnpm-lock.yaml|yarn.lock|.npmrc"
```
to:
```
"package-lock.json|pnpm-lock.yaml|yarn.lock|bun.lock|.npmrc"
```

- [ ] **Step 4: Add `bun.lockb` FileChanged entry**

Add a new entry to the `FileChanged` array:

```json
{
  "matcher": "bun.lockb",
  "hooks": [
    {
      "type": "command",
      "command": "node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile bun-lockb-migration",
      "timeout": 5
    }
  ]
}
```

- [ ] **Step 5: Add `bun-lockb-migration` profile to `config.json`**

Add to the `profiles` object in `config.json`:

```json
"bun-lockb-migration": [
  "bun-lockb-detected"
]
```

- [ ] **Step 6: Commit**

```bash
git add plugins/supply-chain-defence/hooks/hooks.json plugins/supply-chain-defence/scripts/config.json
git commit -m "feat(supply-chain-defence): add bun hook coverage

Bash(bun *) triggers bash-guard and post-install-audit hooks.
bun.lock added to FileChanged matcher. bun.lockb changes trigger
migration guidance via bun-lockb-detected check."
```

---

### Task 12: Update `sync.sh` to generate VERSION from `plugin.json`

**Files:**
- Modify: `plugins/supply-chain-defence/scripts/sync.sh`

- [ ] **Step 1: Update `sync.sh`**

Replace the entire file:

```bash
#!/bin/bash
set -euo pipefail

# sync.sh — The ONLY script that uses CLAUDE_PLUGIN_ROOT.
# Generates VERSION from plugin.json, then copies scripts/ to CLAUDE_PLUGIN_DATA if version mismatch.

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
SOURCE_DIR="${PLUGIN_ROOT}/scripts"
TARGET_DIR="${CLAUDE_PLUGIN_DATA}/scripts"

# Generate VERSION from plugin.json (canonical source)
PLUGIN_JSON="${PLUGIN_ROOT}/.claude-plugin/plugin.json"
if [[ ! -f "${PLUGIN_JSON}" ]]; then
  echo "ERROR: ${PLUGIN_JSON} not found" >&2
  exit 0  # Non-blocking — don't break session start
fi
VERSION=$(node -p "require('${PLUGIN_JSON}').version")
echo "${VERSION}" > "${SOURCE_DIR}/VERSION"

# Read target version (may not exist yet)
TARGET_VERSION=""
if [[ -f "${TARGET_DIR}/VERSION" ]]; then
  TARGET_VERSION=$(cat "${TARGET_DIR}/VERSION")
fi

# Compare and sync if needed
if [[ "${VERSION}" != "${TARGET_VERSION}" ]]; then
  mkdir -p "${TARGET_DIR}"
  # Remove old scripts to avoid stale files
  rm -rf "${TARGET_DIR:?}/"*
  cp -R "${SOURCE_DIR}/"* "${TARGET_DIR}/"
fi

exit 0
```

- [ ] **Step 2: Verify sync.sh is executable**

Run: `ls -la plugins/supply-chain-defence/scripts/sync.sh`
Expected: Should have execute permission (`-rwxr-xr-x`)

If not: `chmod +x plugins/supply-chain-defence/scripts/sync.sh`

- [ ] **Step 3: Commit**

```bash
git add plugins/supply-chain-defence/scripts/sync.sh
git commit -m "fix(supply-chain-defence): generate VERSION from plugin.json in sync.sh

plugin.json is now the canonical version source. sync.sh generates
scripts/VERSION from it at session start, eliminating version drift."
```

---

### Task 13: Final verification

- [ ] **Step 1: Run all tests**

Run: `cd plugins/supply-chain-defence && node --test tests/checks.test.js tests/utils.test.js 2>&1`
Expected: All tests PASS

- [ ] **Step 2: Verify no `execSync` remains**

Run: `grep -r "execSync" plugins/supply-chain-defence/scripts/`
Expected: No output

- [ ] **Step 3: Verify VERSION matches plugin.json**

Run: `cat plugins/supply-chain-defence/scripts/VERSION && node -p "require('./plugins/supply-chain-defence/.claude-plugin/plugin.json').version"`
Expected: Both print `0.1.1`

- [ ] **Step 4: Spot-check hooks.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('plugins/supply-chain-defence/hooks/hooks.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 5: Spot-check config.json is valid JSON and has new profiles**

Run: `node -e "const c = JSON.parse(require('fs').readFileSync('plugins/supply-chain-defence/scripts/config.json', 'utf8')); console.log('quick:', c.profiles.quick); console.log('doctor:', c.profiles.doctor); console.log('bun-lockb-migration:', c.profiles['bun-lockb-migration'])"`
Expected: All three profiles listed, `quick` and `doctor` include `bun-lockb-detected` and `bun-gaps`
