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

Example config files are shipped with this plugin. To locate them from this skill, the path is `${CLAUDE_SKILL_DIR}/../../examples/` (CLAUDE_SKILL_DIR resolves to the skill's own directory within the plugin). Read the relevant example file as a template before generating each config. Adapt the template for the project's detected package manager and lockfile.

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

- **npm:** Read `${CLAUDE_SKILL_DIR}/../../examples/.npmrc` as template. Create or update the project's `.npmrc`. Preserve any existing settings that don't conflict (e.g., auth tokens, scoped registry entries). Only add/update the security-relevant settings from the template.
- **pnpm:** Read `${CLAUDE_SKILL_DIR}/../../examples/pnpm-workspace.yaml` as template. Add `minimumReleaseAge` to the project's existing `pnpm-workspace.yaml`. Preserve existing `packages` and other settings.
- **yarn:** Read `${CLAUDE_SKILL_DIR}/../../examples/.yarnrc.yml` as template. Add `npmMinimumReleaseAge` to the project's existing `.yarnrc.yml`. Preserve existing settings.

## Step 3: Lockfile-Lint Config

Read `${CLAUDE_SKILL_DIR}/../../examples/.lockfile-lintrc` as template. Create `.lockfile-lintrc` in the project root, substituting `path` and `type` for the detected lockfile and package manager.

## Step 4: package.json Security Scripts

Read `${CLAUDE_SKILL_DIR}/../../examples/package-json-scripts.json` as template. Add the `preinstall` and `audit:security` scripts to the project's `package.json`, adapting lockfile path and package manager commands.

Use the package manager to add the scripts where possible (e.g., `npm pkg set`). If that's not feasible, edit `package.json` directly — but only the `scripts` field, never dependency fields.

## Step 5: CI Workflow (GitHub Actions)

Ask the user if they want a CI security workflow. If yes:

Read `${CLAUDE_SKILL_DIR}/../../examples/github-actions/supply-chain-check.yml` as template. Create `.github/workflows/supply-chain-check.yml`, adapting for the detected package manager.

## Verification

After making changes, summarise what was created/updated and remind the user to:
1. Review the changes
2. Commit the new config files
3. Restart Claude Code if hooks need to pick up new config settings
