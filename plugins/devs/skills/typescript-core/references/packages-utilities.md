# Packages – Utilities & Misc

Utility libraries beyond the core stack.

| Package | Verified | When | Gotcha |
| --- | --- | --- | --- |
| `type-fest` | 5.8.0 | Branded IDs (`Tagged`), `JsonValue`, `PartialDeep`, `SetOptional`, `LiteralUnion` | The branding type is `Tagged` — there is no usable `Opaque` or `Brand`. Heavy types can slow the language server. |
| `ts-pattern` | 5.9.0 | Exhaustive pattern matching over discriminated unions | Last publish 2025-10 — stable and feature-complete, not dead. |
| `es-toolkit` | 1.50.0 | Every lodash-shaped need: `debounce`, `cloneDeep`, `groupBy`, … | `es-toolkit/compat` gives drop-in lodash signatures during migration. |
| `typeid-js` | 1.2.0 | Type-prefixed, K-sortable IDs (UUIDv7-based) | Last publish 2025-02 — dormant, but the TypeID spec is frozen. Suffix is 26 chars after the prefix. |
| `tailwind-variants` | 3.3.1 | Variant-based class composition wherever we use Tailwind | — |

## type-fest — branded types via `Tagged`

Types only; install as a dev dependency.

```ts
import type { Tagged } from 'type-fest';

type UserId = Tagged<string, 'UserId'>;
type OrderId = Tagged<string, 'OrderId'>;

const userId = 'user_123' as UserId;
// @ts-expect-error -- an OrderId is not a UserId
const wrong: OrderId = userId;
```

## ts-pattern

`.exhaustive()` fails to compile when a union member goes unhandled — prefer it over `.otherwise()`.

```ts
import { match, P } from 'ts-pattern';

type Data = { type: 'text'; content: string } | { type: 'img'; src: string };
type Res = { type: 'ok'; data: Data } | { type: 'error'; error: Error };

export const describe = (res: Res): string =>
  match(res)
    .with({ type: 'error' }, ({ error }) => `failed: ${error.message}`)
    .with({ type: 'ok', data: { type: 'text' } }, ({ data }) => data.content)
    .with({ type: 'ok', data: { type: 'img', src: P.select() } }, (src) => `img: ${src}`)
    .exhaustive();
```

## es-toolkit

Always es-toolkit, never lodash: smaller, faster, fully typed. Prefer modern built-ins first (`Array.prototype.at`, `structuredClone`, `Object.groupBy`), es-toolkit for the rest.

## typeid-js

IDs like `user_01m03vvxecexzt16xtnfamrqcj` — a type prefix plus a 26-character base32 UUIDv7 encoding, sortable by creation time. Store as plain strings; with short prefixes they're smaller than a 36-char hyphenated UUID.

```ts
import { typeid, TypeID } from 'typeid-js';

const id = typeid('user'); // TypeID<'user'>
const str = id.toString(); // `user_${string}`, 26-char suffix
export const parsed = TypeID.fromString(str, 'user');
```

`TypeID<'user'>` is branded, so mixing ID kinds fails at compile time. Recency caveat: no release since 2025-02. The spec is stable so we keep using it, but re-check maintenance before adopting it in a new service.

## tailwind-variants

```ts
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'rounded-full font-medium text-white',
  variants: {
    color: { primary: 'bg-blue-500', secondary: 'bg-purple-500' },
    size: { sm: 'px-3 py-1 text-sm', lg: 'px-4 py-3 text-lg' },
  },
  defaultVariants: { color: 'primary', size: 'sm' },
});

export const cls: string = button({ size: 'lg', color: 'secondary' });
```

## Do not reach for

- `lodash` / `lodash-es` → `es-toolkit`.
- type-fest `Opaque` / `UnwrapOpaque` → `Tagged` / `UnwrapTagged`.
- `uuid` for new identifiers → `typeid-js`, or `crypto.randomUUID()` when a plain UUID is required.

Prefer these small, focused, typed libraries over one-off hand-rolled helpers — but don't add trivial dependencies for things modern JS already does. Justify each addition per `dependencies.md`.
