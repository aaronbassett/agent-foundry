---
name: devs:typescript-core
description: "Use when writing, debugging, reviewing, or configuring TypeScript — type errors, tsconfig and strictness setup, ESLint findings, testing with vitest, Node backend or library development, package selection, or monorepo configuration. Contains type-check-verified references, verified strict tsconfig templates, and a curated package stack. For React component/UI work, use devs:react-core alongside this."
---

# TypeScript Core Development

Reference hub for TypeScript work. Verify versions, compiler options, and APIs against npm (`npm view <pkg> version`) and the installed toolchain — never from trained knowledge.

## Reference routing

Load references on demand — not all at once.

| Reference | Use when |
|---|---|
| [strict-configuration.md](references/strict-configuration.md) | tsconfig strictness anatomy, compiler defaults, ESLint flat config |
| [common-errors.md](references/common-errors.md) | The genuinely confusing compiler errors (TS2742, TS1484, TS1479, ...) |
| [error-handling.md](references/error-handling.md) | Result types (True Myth), Effect error channel, boundary strategy |
| [patterns.md](references/patterns.md) | ts-pattern, builder/newtype idioms, satisfies / const type params / NoInfer / using |
| [testing.md](references/testing.md) | vitest config, mocking, testing-library setup, MSW, coverage |
| [principles.md](references/principles.md) | Type-safety posture: unknown at boundaries, parse-don't-validate, exhaustiveness |
| [project-structure.md](references/project-structure.md) | exports/imports maps, #-subpath imports, project references, run-TS-directly |
| [dependencies.md](references/dependencies.md) | Version policy, updates, knip/publint/arethetypeswrong, audit, provenance |
| [packages-always-use.md](references/packages-always-use.md) | The curated default stack (zod, Effect, True Myth, LogTape, ...) |
| [packages-utilities.md](references/packages-utilities.md) | type-fest (Tagged), es-toolkit, ts-pattern, TypeID |
| [packages-cli.md](references/packages-cli.md) | CLI framework decision table, @inquirer/prompts, Ink 7, ora, listr2 |

For code-review checklists use the `devs:code-review` skill; React UI work belongs to `devs:react-core` / the react-dev agent.

## Decision guides

**Package manager:** detect from the lockfile in existing projects and conform (`pnpm-lock.yaml`/`bun.lock`/`yarn.lock`/`package-lock.json`); prefer pnpm otherwise. Wrap network-touching commands in Socket Firewall when available: `sfw pnpm add …`, `sfw npm install`.

**Test runner:** vitest by default; `node:test` when zero-dependency matters. Details: [testing.md](references/testing.md).

**Error strategy:** exceptions at the edges, typed Results (True Myth) or Effect in the core — the decision table is in [error-handling.md](references/error-handling.md).

**Package selection:** the curated stack in [packages-always-use.md](references/packages-always-use.md) (with do-not-use lists). Prefer the platform (`fetch`, `node:test`, Temporal) when it covers the need.

**Invoking tsc:** through the project's scripts or `./node_modules/.bin/tsc` — bare `npx tsc` resolves to a squatter package, not TypeScript.

## tsconfig templates (`${CLAUDE_SKILL_DIR}/assets/tsconfig-templates/`)

TS-7-verified. `strict-base.json` is the shared baseline (strict + the valuable non-implied flags + `verbatimModuleSyntax`); variants extend it — copy the base plus one variant:

- `strict-node.json` — Node service: nodenext, `types: ["node"]`, `erasableSyntaxOnly` (sources run directly under Node's type stripping).
- `library.json` — published library: nodenext resolution, declarations + `isolatedDeclarations`.
- `strict-react.json` — React app: bundler resolution, `jsx: react-jsx`, `noEmit`.
- `monorepo-base.json` — workspace base: composite + declarations; packages add include/rootDir/outDir and project references.

All nodenext variants require `"type": "module"` in package.json (TS1287 otherwise — the comment in each file says so).

This skill deliberately ships no scaffolding scripts: framework CLIs (`npm create vite`, `pnpm create ...`) own scaffolding in this ecosystem; these templates and the greenfield spec in the typescript-dev agent cover the TypeScript layer.
