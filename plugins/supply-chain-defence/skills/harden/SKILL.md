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

## Reference Examples

Example config files are in `${CLAUDE_SKILL_DIR}/examples/`. Read the relevant example file as a template before generating each config. Adapt the template for the project's detected package manager and lockfile.

## Step 1: Detect Package Manager

Check for lockfiles in the project root:

| Lock file | Package manager | Config file |
|---|---|---|
| `pnpm-lock.yaml` | pnpm | `pnpm-workspace.yaml` |
| `package-lock.json` | npm | `.npmrc` |
| `yarn.lock` | yarn | `.yarnrc.yml` |
| None | pnpm (default) | `pnpm-workspace.yaml` |

## Step 2: Package Manager Config

Based on the detected package manager, read the corresponding example template and generate the config:

- **npm:** Read `${CLAUDE_SKILL_DIR}/examples/.npmrc` as template. Create or update the project's `.npmrc`. Preserve any existing settings that don't conflict (e.g., auth tokens, scoped registry entries). Only add/update the security-relevant settings from the template.
- **pnpm:** Read `${CLAUDE_SKILL_DIR}/examples/pnpm-workspace.yaml` as template. Add `minimumReleaseAge` to the project's existing `pnpm-workspace.yaml`. Preserve existing `packages` and other settings.
- **yarn:** Read `${CLAUDE_SKILL_DIR}/examples/.yarnrc.yml` as template. Add `npmMinimumReleaseAge` to the project's existing `.yarnrc.yml`. Preserve existing settings.

> **lockfile-lint compatibility — read before Steps 3–5.** `lockfile-lint` only
> ships **npm** and **yarn** lockfile parsers. Pointing it at a `pnpm-lock.yaml`
> or a bun lockfile fails with `Unable to find relevant lockfile parser`. For
> **pnpm and bun, skip every lockfile-lint step** below — those package managers
> verify lockfile integrity natively on a frozen-lockfile install. Wiring
> lockfile-lint into a pnpm/bun project breaks `install` (via a failing
> `preinstall`) and fails CI, so only add it for npm/yarn.

## Step 3: Lockfile-Lint Config (npm and yarn only)

**Skip this step for pnpm and bun.** For **npm or yarn**, read
`${CLAUDE_SKILL_DIR}/examples/.lockfile-lintrc` as a template and create
`.lockfile-lintrc` in the project root, substituting `path` and `type` for the
detected lockfile (`package-lock.json`/`npm` or `yarn.lock`/`yarn`).

## Step 4: package.json Security Scripts

Read `${CLAUDE_SKILL_DIR}/examples/package-json-scripts.json` as template. Add the appropriate scripts for the detected package manager:

- **npm / yarn:** add both a lockfile-lint `preinstall` (verifies the lockfile before every install) and an `audit:security` script.
- **pnpm / bun:** do **not** add a lockfile-lint `preinstall` — lockfile-lint cannot parse these lockfiles, so a `preinstall` would fail and break every install. Add only an `audit:security` script using the package manager's native audit (`pnpm audit` / `bun audit`); integrity is verified natively on a `--frozen-lockfile` install.

Use the package manager to add the scripts where possible (e.g., `npm pkg set` / `pnpm pkg set`). If that's not feasible, edit `package.json` directly — but only the `scripts` field, never dependency fields.

## Step 5: CI Workflow (GitHub Actions)

Ask the user if they want a CI security workflow. If yes:

Read `${CLAUDE_SKILL_DIR}/examples/github-actions/supply-chain-check.yml` as template. Create `.github/workflows/supply-chain-check.yml`, adapting for the detected package manager:

- Install with the frozen-lockfile flag (`npm ci` / `pnpm install --frozen-lockfile` / `yarn install --immutable`) and run the package manager's audit.
- Include the **lockfile-lint** step only for **npm/yarn**; omit it for pnpm/bun (it fails CI there).
- `npm audit signatures` requires an npm lockfile — include it only for npm/yarn; it errors in pnpm/bun-only projects.

## Verification

After making changes, summarise what was created/updated and remind the user to:
1. Review the changes
2. Commit the new config files
3. Restart Claude Code if hooks need to pick up new config settings
