---
name: devs:deps-core
description: "Comprehensive dependency management expertise covering TypeScript (npm, yarn, pnpm, bun), Rust (cargo), and Python (pip, poetry, uv). Use when working on projects requiring: (1) Dependency auditing and listing, (2) Checking for outdated packages, (3) Security vulnerability scanning, (4) Finding release notes and changelogs, (5) Preparing upgrade reports with breaking change analysis, (6) Inspecting transient dependencies in lock files, (7) Installing or uninstalling packages, (8) Clearing package caches, (9) Monorepo workspace dependency management, or (10) Cross-ecosystem dependency health checks."
---

# Dependency Management

Comprehensive guidance for managing dependencies across TypeScript, Rust, and Python ecosystems.

## Core Principle

**Commands over inference.** Always run the actual package manager command to get information rather than reading manifest or lock files and inferring state. The package manager is the authority on what is installed, what is outdated, and what is vulnerable.

- `npm ls` tells you what is installed — `package.json` tells you what should be installed. These can differ.
- `cargo tree` shows the resolved dependency graph — `Cargo.toml` shows declared dependencies.
- `pip list` shows what is in the environment — `requirements.txt` shows what was requested.

Reading manifest files is useful for understanding project structure and intent, but command output is the source of truth for current state.

## Ecosystem Detection

If you are dispatched with a specific ecosystem (e.g., "typescript"), skip detection and load the relevant reference directly.

If you need to detect the ecosystem, scan the project root for these files:

| Files Found | Ecosystem | Package Manager |
|---|---|---|
| `package.json` + `package-lock.json` | TypeScript/JS | npm |
| `package.json` + `yarn.lock` | TypeScript/JS | yarn |
| `package.json` + `pnpm-lock.yaml` | TypeScript/JS | pnpm |
| `package.json` + `bun.lockb` | TypeScript/JS | bun |
| `package.json` (no lock file) | TypeScript/JS | npm (default, warn about missing lock file) |
| `Cargo.toml` | Rust | cargo |
| `pyproject.toml` with `[tool.poetry]` section | Python | poetry |
| `pyproject.toml` with `[tool.uv]` section or `uv.lock` present | Python | uv |
| `pyproject.toml` (no poetry/uv markers) | Python | pip |
| `requirements.txt` (no `pyproject.toml`) | Python | pip |

## Monorepo Detection

Check for workspace configurations:

| Indicator | Type |
|---|---|
| `package.json` with `"workspaces"` field | npm/yarn workspace |
| `pnpm-workspace.yaml` | pnpm workspace |
| `Cargo.toml` with `[workspace]` section | cargo workspace |

When a monorepo is detected:
- Report it to the user
- Ask whether to operate on the workspace root or a specific package (unless already scoped)
- Use workspace-aware commands where available

## Task Reference

Once you know the ecosystem, load the appropriate reference file for specific commands:

| Task | What It Does | Reference |
|---|---|---|
| **Locate dependencies** | List all direct and dev dependencies from manifest files | [typescript.md](references/typescript.md), [rust.md](references/rust.md), [python.md](references/python.md) |
| **Check for updates** | Compare installed versions against latest available | Per-ecosystem reference |
| **Security audit** | Scan for known vulnerabilities (CVEs, advisories) | Per-ecosystem reference |
| **Find release notes** | Locate changelogs or release notes for a package version | Per-ecosystem reference |
| **Upgrade report** | Identify breaking changes, deprecated APIs, migration guides | Per-ecosystem reference |
| **Transient dependencies** | Inspect lock files and dependency trees for indirect deps | Per-ecosystem reference |
| **List installed** | Show what is actually installed (not just declared) | Per-ecosystem reference |
| **Install / uninstall** | Add or remove packages with correct flags | Per-ecosystem reference |
| **Clear caches** | Clean package manager caches and stores | Per-ecosystem reference |

## Additional Principles

- **Security audits before upgrades** — know what is vulnerable before changing versions
- **Never upgrade without understanding breaking changes** — check changelogs first
- **Lock file changes should be committed separately** from code changes when possible
- **Prefer exact versions in applications**, semver ranges in libraries
- **Check the lock file, not just the manifest** — what is declared and what is installed can differ
