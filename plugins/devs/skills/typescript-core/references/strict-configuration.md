# Strict Configuration

Strict tsconfig anatomy and lint setup. Ready-to-copy templates live in [`../assets/tsconfig-templates/`](../assets/tsconfig-templates/): `strict-base.json` plus `strict-node`, `strict-react`, `library`, and `monorepo-base` variants.

## tsconfig anatomy: what `strict` buys, and what it doesn't

`"strict": true` enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`, and `strictBuiltinIteratorReturn`. Never repeat these individually.

Not implied by `strict` — add explicitly:

| Flag | Why |
|---|---|
| `noUncheckedIndexedAccess` | `arr[i]` is `T \| undefined`; forces the emptiness check |
| `exactOptionalPropertyTypes` | `{ x?: T }` rejects explicit `undefined` writes (TS2375/TS2412) |
| `noImplicitReturns` | every code path returns |
| `noImplicitOverride` | `override` keyword required |
| `noFallthroughCasesInSwitch` | no silent case fallthrough |
| `noUncheckedSideEffectImports` | `import "./x"` must resolve; typo'd side-effect imports were silently ignored before |
| `verbatimModuleSyntax` | emit matches source; type-only imports must say `import type` (TS1484) |
| `erasableSyntaxOnly` | bans enum / namespace / parameter properties (TS1294) so `node foo.ts` works — Node 26 strip-only mode hard-errors on enums |
| `isolatedDeclarations` | libraries only: tool-independent `.d.ts` emit; exports need explicit types (TS9010/TS9013) |

`skipLibCheck: true` — check your code, not your dependencies'. tsc's default is `false`; the templates set `true` deliberately, because a broken `.d.ts` inside node_modules is not actionable in your PR.

Module settings: `module: "nodenext"` for anything Node executes (sets matching resolution and permits `require()` of ESM), `module: "preserve"` with `moduleResolution: "bundler"` for bundler-owned frontend code. `target: "es2024"` with `lib` to match.

## Compiler defaults the templates encode

- Nothing under `node_modules/@types` is auto-included — Node projects must set `"types": ["node"]` or globals like `process` fail (TS2591).
- Set `rootDir` explicitly when emitting (`"./src"`), or output nests as `dist/src/`.
- There is no `baseUrl` option; `paths` entries resolve relative to the tsconfig on their own.
- `moduleResolution` is `nodenext` or `bundler`; `module` is `nodenext`, `preserve`, `es2022`+, or `commonjs`.
- Plain `"dom"` in `lib` includes the iterable DOM APIs.

## ESLint + typescript-eslint

ESLint configuration is one flat `eslint.config.js` (there is no eslintrc format). This setup enables typed linting — rules like `@typescript-eslint/no-floating-promises` need it:

```js
// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
```

`projectService: true` replaces the old `parserOptions.project` array. The `**/*.js` block keeps type-aware rules off files outside the TS project — including this config file, which otherwise fails with a project-service parsing error.

Toolchain pin that will bite you: typescript-eslint 8.67.0 declares peer `typescript >=4.8.4 <6.1.0` — it drives the JS compiler API, which TS 7's native binary doesn't expose, so npm ERESOLVEs against typescript 7.0.2. Give the lint toolchain its own `typescript@6.0.3`; compiling the same repo with tsc 7 is fine.

Beyond the presets: `eqeqeq`, import cycle/order rules via `eslint-plugin-import-x`. Formatting belongs to Prettier or Biome, not lint rules.

## CI gates

- `tsc --noEmit` on every push — native tsc 7 is fast enough. Always run the repo-local `./node_modules/.bin/tsc`; `npx tsc` resolves the npm package literally named `tsc`, which is not TypeScript.
- `eslint . --max-warnings 0`.
- React apps: keep `<StrictMode>` in dev; it costs nothing in production.
- Compile-time strictness stops at the process boundary — validate `process.env` and other runtime inputs with Zod at startup.
