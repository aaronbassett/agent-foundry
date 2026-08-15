# Project Structure

Verified on Node 26 / TypeScript 7.0.

## Source layout

All source under `src/`, entry at `src/index.ts`, build output to `dist/` (gitignored). Group by **feature, not technical type**:

```
src/
├─ features/<name>/     # UI + logic + types for one business domain
│   ├─ components/  hooks/  services/  types.ts
├─ components/ui/       # context-free primitives; common/ for cross-feature pieces
├─ lib/                 # shared utilities, API clients, config
├─ state/               # global stores
└─ index.ts(x)
```

Backend: same idea with `modules/<name>/{routes,services,models}` plus `middleware/`. Co-locate tests (`foo.test.ts` next to `foo.ts`). A helper used by one feature lives in that feature, not `lib/`.

Layering: UI → services (pure logic / Effect) → data access. UI never queries directly; data modules expose a clean interface.

## package.json `exports` and `imports`

Every package declares `exports` — it defines the public API and blocks deep imports:

```jsonc
{
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./plugin": { "types": "./dist/plugin.d.ts", "default": "./dist/plugin.js" }
  },
  "imports": { "#/*": "./src/*" }
}
```

The `imports` field gives `#/*` subpath aliases (`import { db } from '#/lib/db.js'`) — resolved by Node and by `tsc` under `moduleResolution: "nodenext"` with no bundler config (verified on Node 26 + TS 7.0). Prefer it over `paths`, which is compile-time-only. Validate published `exports` with publint/attw (see [dependencies.md](dependencies.md)).

## Monorepos: workspaces + project references

pnpm workspaces for package boundaries; internal deps use the workspace protocol so they never resolve from the registry:

```jsonc
"dependencies": { "@acme/core": "workspace:*" }
```

Pair with TypeScript project references so `tsc --build` type-checks incrementally in dependency order:

- Each package: `"composite": true` in its tsconfig.
- Dependents list `"references": [{ "path": "../core" }]`.
- Root tsconfig references all packages; CI runs `tsc --build`.

No cyclic package deps; cross-package imports only via each package's `exports`.

## Shared tsconfig with `${configDir}`

`${configDir}` (TS 5.5+) resolves to the directory of the **final** tsconfig, so one shared base can set paths that land correctly in every package:

```jsonc
// tsconfig.base.json — extended by every package
{
  "compilerOptions": {
    "outDir": "${configDir}/dist",
    "rootDir": "${configDir}/src"
  }
}
```

Without it, `outDir` in an extended config resolves relative to the base file — the classic monorepo trap. Compiler flags themselves belong in [strict-configuration.md](strict-configuration.md).

## Running TS directly (ts-node is legacy)

- **Node runs `.ts` files natively**: `node src/index.ts` works with no flag on current Node (type stripping; verified on Node 26). Constraint: **erasable syntax only** — `enum`, `namespace`, and constructor parameter properties throw at load unless you pass `--experimental-transform-types`. Enforce compatibility in tsconfig with `"erasableSyntaxOnly": true` (TS 5.8+; emits TS1294 on violations — verified).
- **tsx** (4.x, current) when you need watch mode, older Node, or non-erasable syntax: `tsx watch src/index.ts`.
- Don't add ts-node to new projects.

Type-checking stays a separate step (`tsc --build` / `tsc --noEmit`) — neither Node nor tsx checks types.

## Config hygiene

- Root: lint/format configs, `pnpm-workspace.yaml`, base tsconfig; per-package tsconfigs extend the base.
- CLI projects: same core/commands split; framework choice and structure are owned by [packages-cli.md](packages-cli.md).
