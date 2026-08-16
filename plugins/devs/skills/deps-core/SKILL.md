---
name: devs:deps-core
description: "Use when auditing, inspecting, or changing project dependencies in TypeScript/JavaScript (npm, pnpm, yarn, bun), Rust (cargo), or Python (uv, pip, poetry) — vulnerability audits, outdated checks, dependency-tree tracing, upgrade reports, installs/removals, cache management, and cross-ecosystem health reports. Owns the verified command surface and ecosystem detection; dependency policy (version ranges, lockfile rules, supply-chain posture) belongs to the language skills."
---

# Dependency Management — Command Surface

Mechanics for dependency work: detection, the verified commands per ecosystem, and cross-ecosystem orchestration. Policy lives with the language skills (typescript-core, rust-core, python-core dependency references) — where they speak, they win. Verify versions and vulnerability data with commands and registries at use-time, never from memory.

## Detection

**Package manager — in this order, first match wins:**

1. `packageManager` field in package.json (corepack declaration) — authoritative, outranks lockfile inference.
2. Lockfile: `pnpm-lock.yaml` → pnpm; `package-lock.json` → npm; `yarn.lock` → yarn (classic vs modern from the `packageManager` field or `.yarnrc.yml` presence); `bun.lock` → bun (`bun.lockb` is the legacy binary form — flag it for migration).
3. Python: `uv.lock` → uv; `poetry.lock` or `[build-system] requires = ["poetry-core"]` → poetry (don't key on `[tool.poetry]` alone — PEP 621 projects may not have it); `Pipfile.lock` → pipenv; bare `requirements.txt` → pip.
4. Rust: `Cargo.toml` → cargo.
5. **No JS lockfile → pnpm, and the missing lockfile is a finding.** Multiple conflicting lockfiles in one root is a finding, not a coin flip.

**Workspaces:** `workspaces` field (npm/yarn/bun), `pnpm-workspace.yaml` (also pnpm's settings file — `minimumReleaseAge`, `onlyBuiltDependencies`, catalogs live there), `[workspace]` in Cargo.toml, `[tool.uv.workspace]`. When dispatched non-interactively, default to the workspace root and say so in the report.

## Install policy (environment-enforced)

Supply-chain hooks in this environment hard-block bare `npx`, `npm install/add`, `pnpm install/add/dlx`, `yarn install/add/dlx`, `bun add`, `bun x`, `pip install`, `uv add`, `uv pip install`, `uvx`, `pipx`, and pipe-to-shell. Clean installs pass (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `bun install --frozen-lockfile`), and `cargo add`/`cargo install` are exempt. The sanctioned route for everything else is the Socket Firewall wrapper: `sfw pnpm add <pkg>`, `sfw uv add <pkg>` — mandatory when `sfw` is on PATH. Prefer built-in auditors (`pnpm audit`, `bun audit`, `uv audit`, `cargo audit`) before considering any plugin; a missing tool is reported, not installed around the block.

## Reference routing

| Reference | Use when |
|---|---|
| [typescript.md](references/typescript.md) | npm/pnpm/yarn/bun command matrices: audit, outdated, why, tree, cache, workspaces |
| [rust.md](references/rust.md) | cargo built-in surface and the plugin table (cargo-audit, cargo-deny, …) with install gating |
| [python.md](references/python.md) | uv-first commands; pip for unmanaged environments; poetry for legacy projects |
| [cross-ecosystem.md](references/cross-ecosystem.md) | osv-scanner, registry query recipes, severity normalization, merging multi-ecosystem reports |
