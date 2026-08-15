# Testing

Vitest-first: config, mocking, DOM testing, MSW, coverage, and a zero-dependency `node:test` option.

| Tool | Version | Role |
|---|---|---|
| `vitest`, `@vitest/coverage-v8` | 4.1.10 | runner + V8 coverage |
| `@testing-library/react` | 16.3.2 | component tests (react 19.2.8) |
| `@testing-library/jest-dom` | 7.0.1 | DOM matchers via `/vitest` entry |
| `@testing-library/user-event` | 14.6.4 | interactions — always awaited |
| `msw` | 2.15.0 | HTTP mocking at the network layer |
| `@faker-js/faker` | 10.6.0 | test data (scoped name; bare `faker` is a different, dead package) |
| `jsdom` | 30.0.1 | DOM environment (`happy-dom` 20.11.2 is the faster alternative) |

## Config

```ts
// vitest.config.ts
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [...configDefaults.exclude, "node-tests/**"],
    coverage: { provider: "v8" },
  },
});
```

```ts
// tests/setup.ts — registers toBeInTheDocument, toHaveTextContent, …
import "@testing-library/jest-dom/vitest";
```

Without that setup import, jest-dom matchers don't exist. Run `npx vitest run`; coverage with `npx vitest run --coverage`.

## Mocking: vi.fn / vi.mock

Vitest has no `jest.*` globals — the API is `vi`:

```ts
import { expect, test, vi } from "vitest";
import { sendWelcome } from "../src/notify.js";
import { sendEmail } from "../src/email.js";

vi.mock("../src/email.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

test("sends a welcome email", async () => {
  await sendWelcome("ada@example.com");
  expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
    "ada@example.com",
    expect.stringContaining("Welcome"),
  );
});
```

`vi.mock` is hoisted; its path must match the import specifier exactly. `vi.mocked()` gives the typed handle.

## Components: Testing Library + userEvent

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vitest";

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>count: {n}</button>;
}

test("increments on click", async () => {
  const user = userEvent.setup();
  render(<Counter />);

  const button = screen.getByRole("button", { name: /count: 0/i });
  expect(button).toBeInTheDocument();

  await user.click(button);
  expect(button).toHaveTextContent("count: 1");
});
```

Every `user.*` call returns a promise — an un-awaited `user.click` races the assertion. Use `userEvent.setup()`, not direct calls. Query by role and accessible name, not DOM structure.

## HTTP: MSW

Mock at the network layer once, not per HTTP client:

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

const server = setupServer(
  http.get("https://api.example.com/user", () =>
    HttpResponse.json({ name: "Ada" }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("returns the mocked payload", async () => {
  const res = await fetch("https://api.example.com/user");
  expect(await res.json()).toEqual({ name: "Ada" });
});
```

The same handlers serve `fetch`, axios, or anything else; `onUnhandledRequest: "error"` turns forgotten endpoints into failures instead of live calls.

## Test data: @faker-js/faker

```ts
import { faker } from "@faker-js/faker";
import { expect, test } from "vitest";

test("seeded faker is deterministic", () => {
  faker.seed(42);
  const first = { name: faker.person.fullName(), email: faker.internet.email() };
  faker.seed(42);
  expect({ name: faker.person.fullName(), email: faker.internet.email() }).toEqual(first);
});
```

Seed in factories or a setup hook so failures reproduce exactly.

## Zero-dep option: node:test

When a package must carry no dev dependencies, Node 26 runs TypeScript natively (type stripping — note the literal `.ts` specifier):

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { toSlug } from "../src/slug.ts";

test("toSlug", () => {
  assert.equal(toSlug("Hello World"), "hello-world");
});
```

`node --test node-tests/slug.node.test.ts` — passes with no installs. Keep these files out of Vitest's glob (the `exclude` above), and pass file paths rather than a bare directory.

## Ground rules

- Test behavior, not implementation; unit tests stay isolated, integration tests use MSW or a disposable database — never live services.
- Deterministic always: `vi.useFakeTimers()` for time, seeded faker for data.
- `--runInBand` is a Jest flag and does not exist here. Vitest's isolation knobs are `--no-file-parallelism` and `pool` options — reach for them only after fixing the shared state that made tests order-dependent.
- Co-locate as `*.test.ts` / `*.test.tsx`; keep E2E in Playwright, small and limited to critical flows.
- Coverage: the v8 provider is built in via `@vitest/coverage-v8`; target meaningful coverage of branching logic over a headline percentage.
