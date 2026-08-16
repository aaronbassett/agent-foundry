# TypeScript / JavaScript Dependency Mechanics

Verified command surface for inspecting, auditing, and mutating dependencies under npm, pnpm, yarn, and bun. Policy — version ranges, lockfile discipline, provenance, cooldowns, package selection — lives in the typescript-core skill's dependencies reference; never contradict it: the policy is caret ranges plus a committed lockfile, not exact pins.

## Install policy (this environment)

Supply-chain hooks hard-block bare `npx`, `npm install`/`i`/`add`, `pnpm install`/`i`/`add`/`dlx`, `yarn install`/`add`/`dlx`, `bun add`, and `bun x`. Lockfile-respecting installs pass unblocked: `npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `bun install --frozen-lockfile`. The sanctioned route for mutating commands is the Socket Firewall wrapper — `sfw pnpm add <pkg>` — whose prefix passes the guard while filtering registry traffic. Read-only commands (audit, outdated, why, view, ls) need no wrapper.

## Detection

The package manager is the one the lockfile names:

| Lock file | Package manager | Config |
|---|---|---|
| `package-lock.json` | npm | `.npmrc` |
| `pnpm-lock.yaml` | pnpm | `pnpm-workspace.yaml`, `.npmrc` |
| `yarn.lock` | yarn | `.yarnrc` (1.x), `.yarnrc.yml` (4.x) |
| `bun.lock` | bun | `bunfig.toml` |

`bun.lock` is bun's default text lockfile; the binary `bun.lockb` is legacy, migrated via `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`. Yarn 1.x (classic) and 4.x (modern) are effectively different tools — run `yarn --version` before choosing a yarn form below.

## Audit

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| Audit | `npm audit` | `pnpm audit` | 1.x `yarn audit` / 4.x `yarn npm audit` | `bun audit` |
| JSON output | `npm audit --json` | `pnpm audit --json` | 1.x `yarn audit --json` (NDJSON) / 4.x `yarn npm audit --json` (NDJSON) | `bun audit --json` |
| Production deps only | `npm audit --omit=dev` | `pnpm audit --prod` | 4.x `yarn npm audit --environment production` | `bun audit --prod` |
| Transitive coverage | default | default | 1.x default / 4.x direct-only unless `-R` | default |
| Auto-fix | `npm audit fix` (`--dry-run` previews, `--force` crosses majors) | `pnpm audit --fix` (writes overrides; method `override` or `update`) | none in either line — upgrade the offending package | `bun audit fix` (`--dry-run`, `--latest` crosses your own ranges) |

Exit codes: every auditor exits non-zero when findings remain, so the bare command doubles as a CI gate.

## Outdated

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| Report | `npm outdated` | `pnpm outdated` | 1.x `yarn outdated` / 4.x none | `bun outdated` |
| JSON output | `npm outdated --json` | `pnpm outdated --format json` | 1.x `yarn outdated --json` (NDJSON) / 4.x none | none |

Yarn 4.x has no outdated command. The read-only route is `yarn npm audit` for vulnerabilities plus `yarn npm info <pkg> --fields version` against `yarn info <pkg>` for version drift; `yarn upgrade-interactive` is a mutation UI, not an audit surface. Bun's columns are Current / Update (within range) / Latest, and positional filters take globs (`bun outdated '@types/*'`).

## Why is this installed

| npm | pnpm | yarn | bun |
|---|---|---|---|
| `npm explain <pkg>` | `pnpm why <pkg>` | `yarn why <pkg>` (both lines; 4.x adds `-R`, `--json`, `--peers`) | `bun why <pkg>` (`--top`, `--depth <n>`) |

## Registry view

| npm | pnpm | yarn | bun |
|---|---|---|---|
| `npm view <pkg> [field]` | `pnpm view <pkg> [field]` | 1.x `yarn info <pkg> [field]` / 4.x `yarn npm info <pkg> --fields <a,b>` (`--json`) | `bun info <pkg> [property]` (`--json`; alias `bun pm view`) |

Fields use dot paths: `npm view lodash dist-tags.latest`, `bun info react repository.url`.

## Dependency tree

| npm | pnpm | yarn | bun |
|---|---|---|---|
| `npm ls --all` (`--json`) | `pnpm ls --depth Infinity` (`--json`) | 1.x `yarn list [--depth <n>]` / 4.x `yarn info -R` (`--json`) | `bun pm ls --all` |

In yarn 4.x, `yarn info` reads the project's own tree (add `-A` for all workspaces, `-R` for transitives); only `yarn npm info` queries the registry.

## Dedupe and prune

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| Check only | `npm dedupe --dry-run` | `pnpm dedupe --check` | 4.x `yarn dedupe --check` (exit 1 on duplicates) | none |
| Apply | `npm dedupe` | `pnpm dedupe` | 4.x `yarn dedupe` | none |
| Prune extraneous | `npm prune` (`--dry-run`) | `pnpm prune` | — | none |

Yarn 1.x rejects `yarn dedupe` with an error stating `yarn install` already dedupes.

## Cache

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| Inspect | `npm cache verify`, `npm cache ls` | `pnpm store status`, `pnpm store path` | 1.x `yarn cache list`, `yarn cache dir` | `bun pm cache` (prints path) |
| Clean | `npm cache clean [<key>]` (`--force` for all) | `pnpm store prune` | `yarn cache clean` (both lines) | `bun pm cache rm` |

## Workspace scoping

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| Run script in one package | `npm run <script> -w <pkg>` | `pnpm --filter <pkg> run <script>` | 1.x `yarn workspace <pkg> run <script>` / 4.x `yarn workspaces foreach -A run <script>` with `--include <pkg>` | `bun run --filter <pkg> <script>` |
| Run across all | `npm run <script> --workspaces` | `pnpm -r run <script>` | 4.x `yarn workspaces foreach -A run <script>` | `bun outdated -r`, `--filter` globs |

In yarn 4.x `workspaces foreach` requires an explicit selector — `-A` (all), `-R` (recursive deps), or `-W` (worktree); its examples standardize on `-A`.

## Mutations (through the guard)

| Task | npm | pnpm | yarn | bun |
|---|---|---|---|---|
| Add | `sfw npm install <pkg>` | `sfw pnpm add <pkg>` | `sfw yarn add <pkg>` | `sfw bun add <pkg>` |
| Add dev | `sfw npm install -D <pkg>` | `sfw pnpm add -D <pkg>` | `sfw yarn add -D <pkg>` | `sfw bun add -d <pkg>` |
| Remove | `npm uninstall <pkg>` | `pnpm remove <pkg>` | `yarn remove <pkg>` | `bun remove <pkg>` |
| Reproducible install | `npm ci` | `pnpm install --frozen-lockfile` | `yarn install --immutable` | `bun install --frozen-lockfile` |

Yarn 4.x treats `--frozen-lockfile` as a deprecated alias of `--immutable`, and `--immutable` defaults to on in CI.

## npm 12 delta

Breaking changes in npm 12 that affect dependency work (source: npm CLI changelog, v12.0.0):

- Dependency lifecycle scripts are blocked by default unless allowed by the root package's `allowScripts` policy; record approvals with `npm install-scripts approve`, then run `npm rebuild` to execute newly approved scripts.
- Unknown CLI flags, abbreviated flags, and single-hyphen multi-char shorthands now throw instead of warning (unknown `.npmrc` configs still warn; `strict-npmrc` upgrades them to errors).
- `npm view --json` always returns an array — scripts expecting a bare object for single-version queries must unwrap it.
- git and tarball-URL dependencies are refused by default: `allow-git` and `allow-remote` default to `none` (set `all` or `root` to permit).
- `npm shrinkwrap` is removed and `npm-shrinkwrap.json` is no longer loaded; rename a project-root shrinkwrap to `package-lock.json`.

## Release-age gates

Each manager can refuse versions published too recently:

| PM | Where | Key | Unit |
|---|---|---|---|
| npm | `.npmrc` | `min-release-age` (exemptions: `min-release-age-exclude`) | days |
| pnpm | `pnpm-workspace.yaml` | `minimumReleaseAge` (exemptions: `minimumReleaseAgeExclude`) | minutes (default 1440) |
| yarn 4.x | `.yarnrc.yml` | `npmMinimalAgeGate` (exemptions: `npmPreapprovedPackages`) | duration string, e.g. `"1w"` |
| bun | `bunfig.toml` `[install]` | `minimumReleaseAge` (exemptions: `minimumReleaseAgeExcludes`) | seconds |

The units differ per manager — a one-day gate is `1` (npm), `1440` (pnpm), `"1d"` (yarn), `86400` (bun).

## Machine-parse recipes

Current/latest version pairs, reliably:

```bash
# npm — object keyed by package: {current, wanted, latest, ...}
npm outdated --json
# single package: current from the tree, latest from the registry
npm ls <pkg> --json --depth 0
npm view <pkg> version

# pnpm — object keyed by package: {current, wanted, latest, isDeprecated, dependencyType}
pnpm outdated --format json

# yarn 1.x — NDJSON; the "table" line holds rows [Package, Current, Wanted, Latest, Type, URL]
yarn outdated --json

# yarn 4.x — no outdated command; pair locked (project) with latest (registry)
yarn info <pkg> --json
yarn npm info <pkg> --fields version --json

# bun — no JSON report; parse the Current/Update/Latest table, or pair:
bun pm ls
bun info <pkg> version
```
