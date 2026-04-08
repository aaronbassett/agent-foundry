# Supply Chain Defence: Snags Fix-up

**Date:** 2026-04-08
**Branch:** `supply-chain-plugin-snags`
**Scope:** Security hardening, bun support, consistency fixes

## Summary

Six targeted improvements to the supply-chain-defence plugin: eliminate all `execSync` usage, reconcile version tracking, deduplicate utilities, fix bun audit support, add comprehensive bun lifecycle coverage, and migrate away from the obsolete `bun.lockb` format.

## 1. Convert all `execSync` to `spawnSync`

All 13 files currently using `execSync` are converted to `spawnSync`. No `execSync` remains in the plugin after this change.

### Files and conversion patterns

**Pattern 1 — Shell-interpolated arguments (security fix)**

- `lockfile-integrity.js` line 47: interpolates `lockfile.file` into a shell string
- Becomes: `spawnSync("npx", ["lockfile-lint", "--path", lockfile.file, "--type", lockfile.type, "--allowed-hosts", "npm", "--validate-https"], opts)`

**Pattern 2 — Shell redirections (`2>/dev/null`, `2>&1`)**

- `dependency-tree.js`: `LS_COMMANDS` map changes from strings to `[program, args]` arrays. `2>/dev/null` replaced by `stdio: ["pipe", "pipe", "ignore"]` or capturing and discarding stderr.
- `socket-scan.js`: same pattern for `socket report create --json`
- `provenance-check.js`: `2>&1` (merge stderr into stdout) replaced by capturing both and combining
- `npm-audit.js`: `AUDIT_COMMANDS` map changes from strings to `[program, args]` arrays

**Pattern 3 — Git commands with quoted paths**

- `lockfile-drift.js`: `` `git diff --name-only -- "${lockfile}"` `` becomes `spawnSync("git", ["diff", "--name-only", "--", lockfile], opts)`. Shell quoting becomes unnecessary.
- `npmrc-changed.js`: same pattern for `.npmrc` git diff commands

**Pattern 4 — Static version-check commands**

- `node-version.js`, `socket-installed.js`, `socket-present.js`, `jq-installed.js`, `lockfile-lint-installed.js`, `cyclonedx-installed.js`, and the version check in `lockfile-integrity.js` line 32
- `execSync("tool --version", ...)` becomes `spawnSync("tool", ["--version"], ...)`
- Return value changes: instead of catching the throw on non-zero exit, check `result.status !== 0 || result.error`

### Require changes

All files change `const { execSync } = require("child_process")` to `const { spawnSync } = require("child_process")`.

## 2. Extract `levenshtein()` to `utils.js`

The identical Levenshtein distance function is duplicated in `typosquat-local.js` and `typosquat-bulk.js`. Move it to `utils.js` and export alongside `npmView`, `extractPackageNames`, and `isValidPackageName`.

- `typosquat-local.js`: already imports from `../utils`, add `levenshtein` to the destructure
- `typosquat-bulk.js`: add new `const { levenshtein } = require("../utils")`
- Both files: delete their local `levenshtein` function

## 3. Generate `scripts/VERSION` from `plugin.json`

`plugin.json` is the canonical version source. `scripts/VERSION` becomes a generated artifact.

`sync.sh` gains:
```bash
VERSION=$(node -p "require('${PLUGIN_ROOT}/.claude-plugin/plugin.json').version")
echo "$VERSION" > "${SCRIPT_DIR}/VERSION"
```

This runs at `SessionStart` via the existing sync hook, so `VERSION` always matches `plugin.json`.

## 4. Fix `npm-audit.js` for bun

Change `bun: null` to `bun: ["bun", ["audit", "--json"]]` in the `AUDIT_COMMANDS` map (already converted to `[program, args]` arrays by Section 1).

Remove the early-return "no audit command" path for bun. The existing JSON parsing logic works since `bun audit --json` uses the same npm advisory format.

## 5. Bun hooks, lockfile, and `before-flag` support

### 5a. Add `Bash(bun *)` to hooks.json

- PreToolUse: add `Bash(bun *)` matcher running `bash-guard` profile (same as npm/pnpm/yarn)
- PostToolUse: add `Bash(bun *)` matcher running `post-install-audit` async (same as npm/pnpm/yarn)

### 5b. Migrate lockfile detection from `bun.lockb` to `bun.lock`

Replace `bun.lockb` with `bun.lock` in all lockfile arrays:
- `lockfile-present.js`
- `lockfile-drift.js`
- `lockfile-integrity.js` (in `detectLockfile()`)
- `package-manager.js` — detect `bun.lock` as primary, `bun.lockb` as fallback (both map to `pm: "bun"`)

Update FileChanged hook matcher to: `package-lock.json|pnpm-lock.yaml|yarn.lock|bun.lock|.npmrc`

Add a separate FileChanged entry for `bun.lockb` that runs the `bun-lockb-detected` check (see 5c).

### 5c. New check: `bun-lockb-detected.js`

Returns `warn` when `bun.lockb` exists in the project. Checks `bunfig.toml` for `saveBinaryLockfile = true` under `[install]` and adjusts the migration instructions accordingly.

**With `saveBinaryLockfile` setting in bunfig.toml:**

```
bun.lockb (binary lockfile) detected. This format is unsupported — it was superseded by the text-based bun.lock format in Bun 1.2 (January 2025). Migrate to bun.lock:
1. [ ] Remove the `saveBinaryLockfile` setting from bunfig.toml
2. [ ] Run `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`
3. [ ] Delete bun.lockb

The text format is reviewable in diffs, supported by Socket.dev, and 30% faster for cached installs.
```

**Without the setting:**

```
bun.lockb (binary lockfile) detected. This format is unsupported — it was superseded by the text-based bun.lock format in Bun 1.2 (January 2025). Migrate to bun.lock:
1. [ ] Run `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`
2. [ ] Delete bun.lockb

The text format is reviewable in diffs, supported by Socket.dev, and 30% faster for cached installs.
```

When `bun.lockb` does not exist, returns `pass` silently.

Added to: `quick` profile (SessionStart), `doctor` profile, and FileChanged (on `bun.lockb` modification).

### 5d. `before-flag.js` bun support

Add bun to `PM_INSTRUCTIONS`:
```js
bun: {
  name: "bun",
  file: "bunfig.toml",
  setting: "minimumReleaseAge",
  example: (days) => `Add \`minimumReleaseAge = ${days * 86400}\` under [install] in bunfig.toml (value is in seconds)`,
},
```

Add `getBunfigReleaseAge(cwd)`:
- Read `bunfig.toml`
- Find `minimumReleaseAge = <seconds>` under `[install]`
- Convert seconds to days
- Wire into existing `configuredAge` check alongside `getNpmrcReleaseAge`, `getPnpmReleaseAge`, `getYarnReleaseAge`

Remove `--before` suggestion for bun users since bun does not support that flag.

### 5e. New check: `bun-gaps.js`

When `state.detectedPackageManager === "bun"`, returns `info` with guidance:

```
Bun detected — some supply chain checks have limited support:
- Lockfile integrity: lockfile-lint does not support bun.lock. Manually review bun.lock for unexpected registry URLs.
- Dependency tree: bun pm ls does not support --json output. Run `bun pm ls --all` and review visually.
- Provenance: npm audit signatures is npm-only. No bun equivalent exists — verify critical packages manually on npmjs.com.
```

When PM is not bun, returns `pass` silently.

Added to: `quick` profile (SessionStart) and `doctor` profile.

## Files changed

### Modified
| File | Changes |
|------|---------|
| `scripts/utils.js` | Add `levenshtein()` export |
| `scripts/checks/lockfile-integrity.js` | `execSync` → `spawnSync`, detect `bun.lock` |
| `scripts/checks/dependency-tree.js` | `execSync` → `spawnSync`, `LS_COMMANDS` to arrays |
| `scripts/checks/socket-scan.js` | `execSync` → `spawnSync` |
| `scripts/checks/provenance-check.js` | `execSync` → `spawnSync` |
| `scripts/checks/npm-audit.js` | `execSync` → `spawnSync`, `AUDIT_COMMANDS` to arrays, add `bun audit --json` |
| `scripts/checks/lockfile-drift.js` | `execSync` → `spawnSync`, detect `bun.lock` |
| `scripts/checks/npmrc-changed.js` | `execSync` → `spawnSync` |
| `scripts/checks/node-version.js` | `execSync` → `spawnSync` |
| `scripts/checks/socket-installed.js` | `execSync` → `spawnSync` |
| `scripts/checks/socket-present.js` | `execSync` → `spawnSync` |
| `scripts/checks/jq-installed.js` | `execSync` → `spawnSync` |
| `scripts/checks/lockfile-lint-installed.js` | `execSync` → `spawnSync` |
| `scripts/checks/cyclonedx-installed.js` | `execSync` → `spawnSync` |
| `scripts/checks/typosquat-local.js` | Remove local `levenshtein`, import from utils |
| `scripts/checks/typosquat-bulk.js` | Remove local `levenshtein`, import from utils |
| `scripts/checks/before-flag.js` | Add bun `PM_INSTRUCTIONS`, `getBunfigReleaseAge()`, remove `--before` for bun |
| `scripts/checks/lockfile-present.js` | Replace `bun.lockb` with `bun.lock` |
| `scripts/checks/package-manager.js` | Detect `bun.lock` primary, `bun.lockb` fallback |
| `scripts/config.json` | Add `bun-lockb-detected` and `bun-gaps` to `quick` and `doctor` profiles |
| `scripts/sync.sh` | Generate `VERSION` from `plugin.json` |
| `hooks/hooks.json` | Add `Bash(bun *)` to PreToolUse/PostToolUse, `bun.lock` to FileChanged, `bun.lockb` FileChanged entry |

### New
| File | Purpose |
|------|---------|
| `scripts/checks/bun-lockb-detected.js` | Warn on `bun.lockb`, guide migration to `bun.lock` |
| `scripts/checks/bun-gaps.js` | Inform about bun-specific check limitations |

### Deleted
| File | Reason |
|------|--------|
| (none) | `scripts/VERSION` is kept but becomes generated |

## Testing

- Existing tests in `tests/checks.test.js` and `tests/utils.test.js` need updates for `spawnSync` return shape
- New tests for `levenshtein` in utils
- New tests for `bun-lockb-detected.js` (with/without bunfig setting)
- New tests for `bun-gaps.js` (bun vs non-bun PM)
- New tests for `getBunfigReleaseAge()` in `before-flag.js`
- Verify `bun audit --json` parsing in `npm-audit.js`
