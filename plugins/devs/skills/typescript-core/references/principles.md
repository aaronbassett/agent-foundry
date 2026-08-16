# TypeScript Principles

Compiler posture lives in [strict-configuration.md](strict-configuration.md); this file is the type-safety stance behind it.

## Type-safety posture

- **`unknown` over `any`, always.** `any` is only acceptable inside a narrow, commented shim around an untyped dependency — and prefer writing a minimal module declaration instead.
- **Parse, don't validate, at boundaries.** Data entering the system (HTTP bodies, env vars, file/DB reads, LLM output) is `unknown` until parsed by a schema into a domain type. A boolean "is valid" check that leaves the value typed as `any`/broad is a bug factory; the parse result is the only typed value downstream code sees.
- **Exhaustiveness is compiler-enforced.** Discriminated unions end in `.exhaustive()` (ts-pattern) or a `default` that assigns to `never`; `Record<UnionType, …>` maps use `satisfies` so adding a variant breaks the build, not production.
- **Type assertions (`as`) are boundary tools**, paired with a runtime check or a comment explaining why the compiler can't see the truth. An `as` mid-function is usually a design smell.

## Annotations vs inference

Annotate where types are contracts; infer where they're plumbing:

- Explicit return types on exported/public functions — they stop accidental API changes and speed up the checker.
- Explicit types at module boundaries and empty containers (`const xs: Order[] = []`).
- Everything else: let inference work, and reach for `satisfies` when you want checking without widening (see [patterns.md](patterns.md)).

Dependency and version policy is owned by [dependencies.md](dependencies.md) — this file intentionally says nothing about it.
