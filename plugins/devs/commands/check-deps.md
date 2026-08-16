---
name: devs:check-deps
description: Detect every dependency ecosystem in a project (TypeScript/JavaScript, Rust, Python), identify each one's package manager and workspace root, and run concurrent read-only health checks — vulnerabilities, outdated packages, and hygiene — consolidated into one severity-ranked report.
allowed-tools: ["Task", "Agent", "Read", "Glob", "Grep", "Bash"]
argument-hint: "[path | typescript | rust | python]"
---

Check project dependencies across all detected ecosystems by dispatching concurrent read-only `devs:deps-maintenance` agents.

## Step 1 — Detect ecosystems, package managers, and workspace roots

Target directory: `$ARGUMENTS` if it is a path, else the current working directory. If `$ARGUMENTS` is `typescript`, `rust`, or `python`, detect everything but dispatch only that ecosystem.

Find manifests (cap depth at 4; exclude `node_modules/`, `target/`, `.venv/`, `dist/`, `build/`):

- `package.json` → typescript
- `Cargo.toml` → rust
- `pyproject.toml`, `requirements.txt` → python

**Collapse to workspace roots — one dispatch per root, not per manifest.** A `package.json` with a `workspaces` field, a directory with `pnpm-workspace.yaml`, a `Cargo.toml` with `[workspace]`, or a `pyproject.toml` with `[tool.uv.workspace]` is a root; its member manifests are covered by it and get no separate dispatch.

**Identify the package manager per root** using the deps-core detection order: the `packageManager` field first, then the lockfile (`pnpm-lock.yaml`/`package-lock.json`/`yarn.lock`/`bun.lock`/`bun.lockb`; `uv.lock`/`poetry.lock`/`Pipfile.lock`/`requirements.txt`). Record it — the report headings use the detected manager, and a missing or duplicated lockfile is itself a finding to pass along.

If nothing is found, reply:

> No supported dependency manifests found. Supported: TypeScript/JavaScript (package.json), Rust (Cargo.toml), Python (pyproject.toml / requirements.txt).

## Step 2 — Dispatch one agent per ecosystem, concurrently

Each `devs:deps-maintenance` agent receives:

- Its ecosystem, detected package manager, and workspace root path(s).
- The mandate: "**Read-only run — change nothing.** Check for security vulnerabilities and outdated dependencies using the detected package manager's commands (prefer built-in auditors). If a needed tool is not installed, report the gap — do not install anything. Report findings grouped by severity; include the exact remediation commands a human would run, respecting the environment's install policy (sfw-wrapped, no npx). State every command you ran. If everything is clean, say so explicitly."

Dispatch all ecosystems in a single message so they run concurrently.

## Step 3 — Consolidate

Merge the agents' reports into one, using the cross-ecosystem severity normalization from `devs:deps-core`:

```
## Dependency Health Report

### Security vulnerabilities        ← always first; "None found" if clean
[package, severity (source scale), dependency path, fixed version,
 non-breaking remediation yes/no — worst first, across all ecosystems]

### <Ecosystem> (<detected package manager>)
[outdated by semver impact: major / minor / patch]
[hygiene: missing or duplicate lockfiles, legacy lockfile formats,
 absent tooling worth having]

### Recommended actions
[exact commands in order, sfw-wrapped where mutating]
```

If any agent could not complete a check (missing tool, network failure), list it under the ecosystem as "not checked: <what> — <why>" rather than silently omitting it.
