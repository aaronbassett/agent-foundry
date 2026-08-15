# Common TypeScript Errors

Every message below was reproduced verbatim with tsc 7.0.2, and every fix compiles clean. Format: trigger → error → fix → the tempting fix to avoid.

## TS2883 (was TS2742): inferred type cannot be named

**Trigger:** `declaration: true` and an exported value whose inferred type lives in a transitive dependency you can't import — pnpm's nested node_modules is the classic cause. `export const client = makeClient();` where `makeClient` returns a type from `lib`'s own dependency:

```text
error TS2883: The inferred type of 'client' cannot be named without a reference
to 'ClientOptions' from 'lib/node_modules/inner'. This is likely not portable.
A type annotation is necessary.
```

**Fix:** annotate with a nameable type: `export const client: ReturnType<typeof makeClient> = makeClient();` — or import the type where the library re-exports it.
**Trap:** deep-importing `lib/node_modules/inner` (breaks on any hoisting change) or adding the transitive dep as a phantom direct dependency.

## TS1484: type-only import under verbatimModuleSyntax

**Trigger:** `import { User } from "./types.js";` where `User` is only a type.

```text
error TS1484: 'User' is a type and must be imported using a type-only import
when 'verbatimModuleSyntax' is enabled.
```

**Fix:** `import type { User } from "./types.js";` — for mixed imports, `import { createUser, type User }`.
**Trap:** disabling `verbatimModuleSyntax`; you lose the guarantee that emitted imports match source, which type-stripping runtimes depend on.

## TS1479: require of an ESM-only package

**Trigger:** `module: "node16"`, a CommonJS file, `import { greet } from "esm-only"` where the package is `"type": "module"`.

```text
error TS1479: The current file is a CommonJS module whose imports will produce
'require' calls; however, the referenced file is an ECMAScript module and
cannot be imported with 'require'. Consider writing a dynamic
'import("esm-only")' call instead.
```

**Fix:** `module: "nodenext"` — modern Node supports `require()` of ESM, and the identical code compiles clean under nodenext (verified).
**Trap:** wrapping call sites in `await import()`; it works but turns sync code paths async for nothing.

## TS2375 / TS2412: exactOptionalPropertyTypes

**Trigger:** writing an explicit `undefined` into `retries?: number`.

```text
error TS2375: Type '{ retries: undefined; }' is not assignable to type 'Config'
with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the
types of the target's properties.
error TS2412: Type 'undefined' is not assignable to type 'number' with
'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of
the target.
```

TS2375 fires on object literals, TS2412 on property assignment.
**Fix:** omit the property (or `delete cfg.retries`); when "present but undefined" is genuinely meaningful, declare `retries?: number | undefined`.
**Trap:** `as Config` casts or disabling the flag — both re-open the key-present-with-undefined bug class (`"retries" in cfg`, `Object.keys`, spreads).

## TS1294: erasableSyntaxOnly vs enums, namespaces, parameter properties

**Trigger:** syntax with runtime semantics that stripping can't erase — `enum`, an instantiated `namespace`, `constructor(public x: number)`. Each site reports:

```text
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

**Fix:** `const Color = { Red: 0, Green: 1 } as const; type Color = (typeof Color)[keyof typeof Color];` and plain field assignment in constructors.
**Trap:** dropping the flag. tsc goes quiet but `node main.ts` still dies — Node 26 throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript enum is not supported in strip-only mode` (verified).

## TS2835: relative imports need extensions under nodenext

**Trigger:** `import { answer } from "./helper";` in an ESM package.

```text
error TS2835: Relative import paths need explicit file extensions in ECMAScript
imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean
'./helper.js'?
```

**Fix:** write the emitted name — `"./helper.js"` — even though the source file is `helper.ts`.
**Trap:** `"./helper.ts"` → `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled`, and that flag requires `noEmit`, so it only suits bundled or type-stripped projects.

## TS2591: @types are not auto-included

**Trigger:** `@types/node` installed, but no `types` field in tsconfig. `node_modules/@types/*` is not included automatically; both globals (`process`) and built-in module imports (`node:fs`) fail:

```text
error TS2591: Cannot find name 'node:fs'. Do you need to install type
definitions for node? Try `npm i --save-dev @types/node` and then add 'node'
to the types field in your tsconfig.
```

(Note: TS2591, not TS2307.)
**Fix:** `"types": ["node"]`.
**Trap:** sprinkling `/// <reference types="node" />` per file — one tsconfig line does it.

## TS9010 / TS9013: isolatedDeclarations

**Trigger:** `declaration` + `isolatedDeclarations` with an export whose type needs cross-file inference. `export function getTotal() { return compute(); }` and `export const total = compute();` give:

```text
error TS9013: Expression type can't be inferred with --isolatedDeclarations.
error TS9010: Variable must have an explicit type annotation with --isolatedDeclarations.
```

Literal returns (`return { retries: 3 }`) are still inferable and fine.
**Fix:** annotate every export explicitly.
**Trap:** silencing with `any` or over-wide types — these annotations are your published API; write the type you mean, or drop the flag for that package.
