# Error Handling

Two kinds of failure, two mechanisms:

- **Expected failures** — a query fails, a submit is rejected, data is missing. These are the `error` and `empty` arms of the four-state contract ([patterns.md](patterns.md)): the Container classifies the failure, the View renders the state. Nothing throws.
- **Bugs** — render crashes, impossible states. These are caught by an error boundary. A View never contains a boundary; boundaries wrap it from outside.

## Boundaries

Use the `react-error-boundary` package. Boundaries sit at route and feature level — around the Container/View pair, plus one at the app root as a last resort.

```tsx
// src/components/common/FeatureBoundary.tsx
import type { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary, getErrorMessage } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

interface ComponentLogger {
  error: (message: string, context?: Record<string, unknown>) => void;
}

function FeatureFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong: {getErrorMessage(error) ?? "unknown error"}</p>
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}

interface FeatureBoundaryProps {
  children: ReactNode;
  logger: ComponentLogger;
  resetKeys?: unknown[];
}

export function FeatureBoundary({ children, logger, resetKeys }: FeatureBoundaryProps) {
  const onError = (error: unknown, info: ErrorInfo) => {
    logger.error("uncaught_render_error", {
      error: getErrorMessage(error),
      componentStack: info.componentStack,
    });
  };

  return (
    <ErrorBoundary FallbackComponent={FeatureFallback} onError={onError} resetKeys={resetKeys}>
      {children}
    </ErrorBoundary>
  );
}
```

Notes on the shape:

- Type-only imports (`import type`) keep the file clean under `verbatimModuleSyntax`.
- Thrown values are `unknown` in this API — `getErrorMessage` narrows them safely instead of assuming `Error`.
- The component *receives* a logger; components never configure logging. LogTape setup lives in the typescript-core packages reference.

## Reset

Two ways back to a working tree: the fallback calls `resetErrorBoundary()` (the retry button above), and `resetKeys` resets automatically when an identity the subtree depends on changes — route param, selected id. Boundaries do not catch errors thrown in event handlers or async callbacks; route those to the nearest boundary with `useErrorBoundary().showBoundary(error)`.

## Fallback Rules

`role="alert"`, a short human message, a recovery action. Never stack traces, internal codes, or raw payloads — those go to the logger, not the DOM.

Reset behaviour is testable — this passes against the boundary above:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureBoundary } from "./FeatureBoundary";

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) throw new Error("boom");
  return <p>Recovered</p>;
}

describe("FeatureBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows the fallback, logs, and recovers on reset", async () => {
    const user = userEvent.setup();
    const logger = { error: vi.fn() };

    render(
      <FeatureBoundary logger={logger}>
        <Bomb />
      </FeatureBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(logger.error).toHaveBeenCalledWith(
      "uncaught_render_error",
      expect.objectContaining({ error: "boom" }),
    );

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Recovered")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
```
