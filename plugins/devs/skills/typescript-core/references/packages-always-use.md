# Packages – Always Use (Our Standard Toolkit)

These packages go into every new project by default; APIs shown match the packages' installed `.d.ts` files.

## Baseline toolchain

| Tool | Verified | Notes |
| --- | --- | --- |
| Node.js | 26.x current, 24.x Active LTS | `fetch` and `Temporal` (TC39 Stage 4) are built in. Node 18 is EOL — never target it. |
| TypeScript | 7.0.2 | All strict flags on; see `strict-configuration.md`. |
| pnpm | 11.22.0 | Package manager everywhere. |
| tsdown | 0.22.14 | Bundler for libraries and CLIs. |

## Core packages

| Package | Verified | When | Gotcha |
| --- | --- | --- | --- |
| `effect` | 3.22.1 | All async/concurrent business logic, resource management, typed errors | The API is `Effect.try` / `Effect.tryPromise`; `Effect.tryCatch` does not exist. |
| `zod` | 4.4.3 | Validation at every boundary: request bodies, env vars, external responses | The slim build is the `zod/mini` **subpath** of zod. The npm package `zod-mini` is an unrelated 0.0.1 placeholder — never install it. |
| `@logtape/logtape` | 2.3.1 | Structured logging in apps and libraries | Sinks are wired once via `configure({ sinks, loggers })`; `Logger` has no `addSink` method. |
| `@logtape/pretty` | 2.3.1 | Human-friendly dev log output | Exports `prettyFormatter` / `getPrettyFormatter`; there is no `pretty` export. |
| `true-myth` | 9.4.0 | `Maybe`/`Result` in sync code and React components, outside the Effect runtime | Convert at Effect boundaries (`Effect.option`, `Effect.either`) rather than mixing styles. |
| `vitest` | 4.1.10 | Test runner, with `@testing-library/react` and `msw` 2.15.0 | Use Vitest's built-in types for `describe`/`it`/`expect`; never add `@types/jest`. |

## Effect

Effect replaces raw `Promise` chains, async utility grab-bags, and ad-hoc task runners: fiber-based concurrency, typed failure channels, safe resource acquire/release. Wrap throwing code with `Effect.try`; wrap promise-returning code with `Effect.tryPromise` (which hands you an `AbortSignal`):

```ts
import { Effect } from 'effect';
import { z } from 'zod';

const User = z.object({ id: z.string(), name: z.string() });

export const parseUser = (input: unknown) =>
  Effect.try({
    try: () => User.parse(input),
    catch: (cause) => new Error(`Invalid user: ${String(cause)}`),
  });

export const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: (signal) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
    catch: (cause) => new Error(`Request failed: ${String(cause)}`),
  }).pipe(Effect.flatMap(parseUser));
```

For platform APIs (FS, HTTP servers) use `@effect/platform`. Effect ships its own `Schema`, but Zod stays our validation standard; integrate as above.

## Zod

Parse, don't validate: every external input crosses a Zod schema before it touches typed code. Zod 4 is fast, has excellent error reporting, and offers a bundle-conscious build via the `zod/mini` subpath. Pairs with React Hook Form via `zodResolver` on the front end.

## LogTape

One logging setup for apps and libraries. Libraries call `getLogger()` freely — if the consuming app never configures LogTape, output is silent, so library code can't spam. Configuration happens once, centrally:

```ts
import { configure, getConsoleSink, getJsonLinesFormatter, getLogger } from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';

const dev = process.env.NODE_ENV !== 'production';

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: dev ? prettyFormatter : getJsonLinesFormatter(),
    }),
  },
  loggers: [{ category: ['my-app'], lowestLevel: dev ? 'debug' : 'info', sinks: ['console'] }],
});

export const logger = getLogger(['my-app']);
logger.info('User logged in', { userId: 'user_123' });
```

Argument order is `logger.info(message, properties)` — message first. pino uses the reverse order; don't carry that habit over. Add-ons on the same 2.3.1 release train: `@logtape/redaction` (scrub secrets by field or pattern), `@logtape/file`, `@logtape/sentry`, `@logtape/syslog`.

## True Myth

`Maybe` instead of `null`/`undefined`, `Result` instead of thrown exceptions, in code that doesn't warrant the Effect runtime:

```ts
import Maybe from 'true-myth/maybe';
import Result from 'true-myth/result';

export const findUser = (id: string): Maybe<string> =>
  id === 'u1' ? Maybe.just('Alice') : Maybe.nothing();

export const parsePort = (raw: string): Result<number, string> => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? Result.ok(n) : Result.err(`not a port: ${raw}`);
};
```

`.map`, `.andThen`, `.unwrapOr`, and `match` keep handling explicit and total.

## Dates

`Temporal` is Stage 4 and built into Node 26 — default to it for new date/time code. Add `date-fns` (4.4.0) only when its formatting and interval helpers earn their keep.

## CLI and utility stacks

CLIs (Oclif, Ink, `@inquirer/prompts`, Ora): see `packages-cli.md` for the decision table and verified versions. General utilities (`es-toolkit`, `type-fest`, `ts-pattern`, `typeid-js`): see `packages-utilities.md`.

## Do not reach for

- `lodash` / `lodash-es` → `es-toolkit`, always (see `packages-utilities.md`).
- `zod-mini` (npm package) → squatted placeholder; use the `zod/mini` subpath.
- `@types/jest` → Vitest ships its own types.
- `node-fetch` / `axios` → built-in `fetch`, wrapped in `Effect.tryPromise`; axios only for exotic interceptor/proxy needs, justified in review.
- `winston` / `pino` → LogTape.
- Moment / Luxon → built-in `Temporal`, or `date-fns` 4.x.
