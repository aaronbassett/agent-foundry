# Performance

Profile first: React DevTools Profiler for render cost, the browser Performance panel for main-thread work. Optimizing unmeasured code is how memo soup happens. Measurement tooling is covered in typescript-core's testing reference.

## Code splitting

Split at route boundaries with `lazy` + `Suspense`. Hoist the import thunk and reuse it for hover/focus prefetch, so the chunk downloads before navigation:

```tsx
import { lazy, Suspense } from 'react';

const loadSettings = () => import('./routes/Settings'); // one chunk, shared by both paths
const Settings = lazy(loadSettings);

export function App({ route }: { route: string }) {
  return (
    <>
      <a href="/settings" onMouseEnter={loadSettings} onFocus={loadSettings}>
        Settings
      </a>
      <Suspense fallback={<p>Loading…</p>}>
        {route === '/settings' && <Settings />}
      </Suspense>
    </>
  );
}
```

Vite emits the lazy route as its own chunk. For bundle analysis, add `visualizer()` from `rollup-plugin-visualizer` to `plugins` in the Vite config — each build then writes an interactive treemap (`stats.html`).

## Memoization

With the React Compiler enabled (see the React idioms reference), components already cache values, callbacks, and JSX — manual `React.memo`/`useMemo`/`useCallback` is mostly redundant; add it only where profiling shows the compiler missed. Without the compiler, memoize referential-identity hotspots — props feeding `memo`d children, deps of expensive effects, context values — and nothing else.

## Virtualization

Render a window, not the list. Default to `react-window`: `List` (and `Grid`) mount only visible rows — the 10,000-item list below renders 13 row divs at its 320px default height:

```tsx
import { List, type RowComponentProps } from 'react-window';

function Row({ index, style, users }: RowComponentProps<{ users: string[] }>) {
  return <div style={style}>{users[index]}</div>;
}

export function UserList({ users }: { users: string[] }) {
  return (
    <List
      rowComponent={Row}
      rowCount={users.length}
      rowHeight={32}
      rowProps={{ users }}
      defaultHeight={320}
    />
  );
}
```

For headless control (dynamic measurement, window scrolling, tables), use `useVirtualizer` from `@tanstack/react-virtual`.

## Web vitals

The Core Web Vitals are LCP, INP, and CLS; the `web-vitals` package exports one subscription per metric:

```ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

export function reportVitals(report: (metric: Metric) => void) {
  onCLS(report);
  onINP(report);
  onLCP(report);
}
```

Request waterfalls are the usual LCP and INP killer — see the data-fetching reference in this skill.
