# TypeScript / JavaScript Dependency Management

## Package Manager Detection

Identify the package manager from the lock file present in the project root:

| Lock File | Package Manager | Config File |
|---|---|---|
| `package-lock.json` | npm | `.npmrc` |
| `yarn.lock` | yarn | `.yarnrc.yml` (berry) or `.yarnrc` (classic) |
| `pnpm-lock.yaml` | pnpm | `.npmrc` or `.pnpmrc` |
| `bun.lockb` | bun | `bunfig.toml` |

If no lock file exists, default to npm but warn the user about the missing lock file.

To confirm the version:
- npm: `npm --version`
- yarn: `yarn --version` (1.x = classic, 2+ = berry)
- pnpm: `pnpm --version`
- bun: `bun --version`

## Command Reference

### List Dependencies

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm ls` | `yarn info --all` | `pnpm ls` | `bun pm ls` |
| `npm ls --all` (incl. transient) | `yarn info --all --recursive` | `pnpm ls --depth Infinity` | `bun pm ls --all` |
| `npm ls --json` (machine-readable) | `yarn info --json` | `pnpm ls --json` | — |

### Check for Outdated Packages

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm outdated` | `yarn upgrade-interactive` | `pnpm outdated` | `bun outdated` |
| `npm outdated --json` | — | `pnpm outdated --json` | — |

Output columns: Package, Current, Wanted (semver-compatible), Latest (newest).

### Security Audit

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm audit` | `yarn npm audit` | `pnpm audit` | — |
| `npm audit --json` | `yarn npm audit --json` | `pnpm audit --json` | — |
| `npm audit fix` (auto-fix) | — | — | — |

For yarn classic (1.x): `yarn audit` instead of `yarn npm audit`.

### Install a Package

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` | `bun add <pkg>` |
| `npm install -D <pkg>` | `yarn add -D <pkg>` | `pnpm add -D <pkg>` | `bun add -d <pkg>` |
| `npm install -g <pkg>` | `yarn global add <pkg>` | `pnpm add -g <pkg>` | `bun add -g <pkg>` |
| `npm install` (from lock) | `yarn install` | `pnpm install` | `bun install` |
| `npm ci` (clean install) | `yarn install --immutable` | `pnpm install --frozen-lockfile` | `bun install --frozen-lockfile` |

### Uninstall a Package

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm uninstall <pkg>` | `yarn remove <pkg>` | `pnpm remove <pkg>` | `bun remove <pkg>` |

### View Package Information

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm view <pkg>` | `yarn npm info <pkg>` | `pnpm view <pkg>` | — |
| `npm view <pkg> versions` | `yarn npm info <pkg> --fields versions` | `pnpm view <pkg> versions` | — |
| `npm view <pkg> repository` | — | `pnpm view <pkg> repository` | — |

### Why Is This Package Installed?

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm explain <pkg>` | `yarn why <pkg>` | `pnpm why <pkg>` | — |

### Clear Cache

| npm | yarn | pnpm | bun |
|---|---|---|---|
| `npm cache clean --force` | `yarn cache clean` | `pnpm store prune` | `bun pm cache rm` |
| `npm cache verify` | — | `pnpm store status` | — |

## Lock Files

| Package Manager | Lock File | Format | Commit? |
|---|---|---|---|
| npm | `package-lock.json` | JSON | Yes, always |
| yarn classic | `yarn.lock` | Custom | Yes, always |
| yarn berry | `yarn.lock` | YAML | Yes, always |
| pnpm | `pnpm-lock.yaml` | YAML | Yes, always |
| bun | `bun.lockb` | Binary | Yes, always |

**Reading lock files:** Lock files pin exact versions of every package in the dependency tree (including transient). Use `npm ls --all` / `pnpm ls --depth Infinity` to read the resolved tree rather than parsing lock files directly.

## Monorepo / Workspace Commands

**Detection:**
- `package.json` → `"workspaces": ["packages/*"]`
- `pnpm-workspace.yaml` → `packages: ["packages/*"]`

**Scoped operations:**

| npm | yarn | pnpm |
|---|---|---|
| `npm ls -w <pkg>` | `yarn workspace <pkg> info` | `pnpm ls --filter <pkg>` |
| `npm install <dep> -w <pkg>` | `yarn workspace <pkg> add <dep>` | `pnpm add <dep> --filter <pkg>` |
| `npm run test -w <pkg>` | `yarn workspace <pkg> run test` | `pnpm run test --filter <pkg>` |
| `npm run test --workspaces` | `yarn workspaces foreach run test` | `pnpm run test -r` |

## Finding Release Notes

1. Get the repository URL: `npm view <pkg> repository.url`
2. Check GitHub releases: `https://github.com/<owner>/<repo>/releases`
3. Check for CHANGELOG.md in the repo root
4. Check the package's homepage: `npm view <pkg> homepage`

## Upgrade Report

To prepare an upgrade report for a package:

1. Check current version: `npm ls <pkg>` (or equivalent)
2. Check available versions: `npm view <pkg> versions`
3. Check for breaking changes:
   - Find the repository URL: `npm view <pkg> repository.url`
   - Read the CHANGELOG.md or GitHub releases between current and target version
   - Look for "BREAKING" or "breaking change" entries
   - Major version bumps (e.g., 3.x → 4.x) almost always have breaking changes
4. Check if dependents are compatible: `npm explain <pkg>` to see who depends on it
5. For TypeScript projects, check if `@types/<pkg>` also needs updating
