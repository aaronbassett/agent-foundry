# Code & Type-Level Patterns

## Railway-oriented errors

Functions that can fail return true-myth `Result` or run in Effect's error channel; exceptions only at boundaries. Full guidance in [error-handling.md](error-handling.md).

## Pattern matching with ts-pattern

Use `ts-pattern` (5.x) for discriminated unions instead of `if`/`switch` chains — `.exhaustive()` makes missing variants a compile error:

```ts
import { match, P } from 'ts-pattern';

const message = match(result)
  .with({ status: 'ok', value: P.select() }, (value) => `got ${value}`)
  .with({ status: 'error', error: P.select() }, (err) => `failed: ${err}`)
  .exhaustive();
```

Note `P` must be imported alongside `match` — `P.select()` extracts the matched slice into the handler argument.

For a plain `switch`, get the same guarantee with a `never` check in `default` (assign the discriminant to a `never`-typed variable).

## Type-level idioms

Version tags mark the minimum TypeScript required.

**`satisfies` (4.9)** — validate against a type without widening; literal types survive:

```ts
const routes = { home: '/', user: '/users/:id' } satisfies Record<string, `/${string}`>;
// routes.home is still type '/', not string
```

Prefer `satisfies` over an annotation whenever you want both checking *and* precise inference (config objects, lookup tables, exhaustive `Record<UnionType, …>` maps).

**`const` type parameters (5.0)** — literal/tuple inference at the call site without callers writing `as const`:

```ts
function tuple<const T extends readonly unknown[]>(...args: T): T { return args; }
const t = tuple('a', 'b'); // readonly ["a", "b"], not string[]
```

**`NoInfer` (5.4)** — exclude a position from inference so it's checked against the type inferred elsewhere:

```ts
function exec<T extends string>(states: T[], initial: NoInfer<T>): void {}
exec(['open', 'closed'], 'open');
exec(['open', 'closed'], 'missing'); // error: not 'open' | 'closed'
```

Without `NoInfer`, the bad call widens `T` to include `'missing'` and compiles.

**`using` / `Disposable` (5.2)** — deterministic cleanup at scope exit; Node 26 supports `Symbol.dispose` natively:

```ts
function readOnce(): string {
  using f = openFile('data.txt'); // f[Symbol.dispose]() runs when scope exits
  return f.read();
}
```

Use for locks, temp files, DB handles; `await using` for `AsyncDisposable`. In Effect code, prefer `Effect.acquireRelease`/scopes instead.

## Immutability and pure functions

- Pure functions for core computations; side effects at the edges (Effect pipelines, React effects, service modules) — functional core, imperative shell.
- Never mutate inputs. For deep updates on plain data, Immer (11.x, current) is fine; for most code, spread/`toSorted`/`toSpliced` and `readonly` types suffice.

## Concurrency

- Use Effect fibers for structured concurrency: `Effect.race`, `Effect.forEach` with a `concurrency` option, `Effect.gen` for sequential logic.
- Outside Effect, `async/await` plus `Promise.all`/`AbortController`; never bare `.then` chains.

## Composition over configuration

Small composable functions over boolean-flag options; strategy callbacks over parameter explosions; in React, children/render props over show/hide props.

## Extensibility

For plugin points: define the extension interface explicitly, decouple via DI or events, keep the core minimal, and treat the plugin interface as a public API (changes propagate to every implementation).
