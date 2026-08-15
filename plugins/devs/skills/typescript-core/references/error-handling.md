# Error Handling

How to classify, propagate, and report failures. Verified against `true-myth` 9.4, `effect` 3.22.

## Choosing a strategy

| Situation | Use |
|---|---|
| Sync function with expected failure modes | true-myth `Result<T, E>` |
| Async/concurrent flows, retries, interruption, resource management | Effect's typed error channel |
| Unrecoverable invariant violations | `throw` — caught only by the top-level handler |
| Third-party code that throws/rejects | Wrap at the boundary into `Result`/Effect; raw exceptions never cross layers |

A function either returns `Result`/Effect or is documented to throw — never both. `neverthrow` duplicates true-myth; don't add it.

## User-facing vs internal

- **User-facing** (validation, not-found, business-rule violations): specific error variant, message safe to display, no stack traces. HTTP 4xx.
- **Internal** (I/O failures, bugs): carry `cause` and technical context for logs; user sees a generic message. HTTP 500.

## Result with true-myth

```ts
import { ok, err, type Result } from 'true-myth/result';

function getUserById(id: string): Result<User, NotFoundError | DatabaseError> {
  try {
    const record = db.findById(id);
    if (!record) return err(new NotFoundError(`User ${id} not found`));
    return ok(toUser(record));
  } catch (e) {
    return err(new DatabaseError('Failed to fetch user', { cause: e }));
  }
}

const r = getUserById('1');
if (r.isOk) {
  use(r.value);
} else {
  report(r.error);
}
```

Gotchas:

- `isOk`/`isErr` are **getters**, not methods: `r.isOk`, never `r.isOk()`. Property access narrows the union (`r.value` / `r.error` become available).
- `unwrapOr(default)` and `mapErr(fn)` cover most non-branching handling; `Result.match` exists for the rest.

## Effect

Define typed errors with `Data.TaggedError`; wrap throwing/rejecting code with `Effect.tryPromise`:

```ts
import { Data, Effect } from 'effect';

class GetUserError extends Data.TaggedError('GetUserError')<{
  readonly id: string;
  readonly cause: unknown;
}> {}

const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => loadUser(id),
    catch: (cause) => new GetUserError({ id, cause }),
  });
```

- Add context while propagating with `Effect.mapError((e) => new UserServiceError({ cause: e }))`. There is no `Cause.annotate` — do not invent `Cause` combinators; wrap with a tagged error that keeps the original as `cause`.
- Handle one variant with `Effect.catchTag('GetUserError', …)`; everything with `Effect.catchAll`.
- At the fiber boundary, `Cause.pretty(cause)` renders the full failure tree (failures, defects, interruptions) for logs.

## Propagation rules

- Wrap low-level errors into domain errors **where the semantics change** (driver error → `DatabaseError`), always preserving the original via standard `Error` options: `new DatabaseError('…', { cause: e })`.
- Above that boundary, propagate unchanged. Re-wrapping at every layer buries the root cause.

## Top-level handler

One place per app catches whatever escaped — Express error middleware, CLI catch handler, React error boundary:

- Log the full error (stack + `cause` chain) via LogTape; ship to Sentry with `@logtape/sentry`.
- Emit a generic user message (500 JSON body, friendly CLI line, error toast). Never leak stacks or raw messages to users.
- Redact sensitive values in logged errors (`@logtape/redaction`).

For Effect programs, `catchAll`/`catchTag` at the end of the pipeline is the equivalent single spot; only `Effect.runPromise` failures that represent defects should reach the process-level handler.

## Logging severity

| Case | Level |
|---|---|
| Expected and handled (validation failure) | `info` / `warn` |
| Unexpected but recovered | `error` |
| About to crash or abort the process | `fatal` |

Log the error object itself in a structured field (so stack and cause are captured) plus correlation context (`reqId`, command name).
