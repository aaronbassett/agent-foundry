# State Management

Work down this ladder and stop at the first rung that fits. The react-components skill follows the same ranking.

1. **Local `useState`.** State one component owns. The default; most state never leaves this rung.
2. **Lift or derive.** Shared by siblings? Lift it to the nearest common parent. Computable from existing state or props? Derive it during render (`useMemo` only when measurably expensive). Deriving during render always beats syncing a second copy with an effect — an effect whose job is to mirror one piece of state into another is a bug.
3. **URL state with nuqs.** Anything shareable, bookmarkable, or expected to survive a refresh — filters, pagination, search, active tab — belongs in the URL as typed search params:

   ```tsx
   import { parseAsInteger, useQueryState } from 'nuqs';

   export function Results() {
     const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
     return <button onClick={() => setPage(page + 1)}>Page {page}</button>;
   }
   ```

4. **Server cache with TanStack Query.** Everything that lives on a server. It is a cache, not client state, and is never mirrored into `useState` or a store — read it where you need it. Patterns live in the [data-fetching reference](./data-fetching.md).
5. **Global client state with zustand — sparingly.** Only for genuinely app-wide client concerns: theme, session UI, cross-cutting layout state. If the data came from an API, it belongs on rung 4. Subscribe with selectors so components re-render only for the slice they read.

| State | Home |
| --- | --- |
| One component's UI state | `useState` |
| Needed by siblings | Lift to common parent |
| Computable from other state/props | Derive during render |
| Filters, pagination, search, tabs | URL via nuqs |
| Anything from an API | TanStack Query cache |
| App-wide client concerns | zustand store |

**Group state by what changes together.** Values updated by the same interaction belong in one `useState` (or one reducer); values that change independently get separate hooks.

**`useReducer`'s niche** is several values that must transition together under non-trivial rules — wizards, undo, state machines. It centralizes transitions and keeps impossible states unrepresentable; it is not a data-fetching tool.

**Context is dependency injection, not state management.** Use it to pass stable values — a service client, a theme object, the current user — past intermediate layers. Every consumer re-renders on any value change, so high-churn data does not belong in it; that is what the zustand rung is for.

**`useSyncExternalStore`** is the primitive for subscribing render output to external mutable sources (browser APIs, non-React stores); reach for it when writing bindings, rarely in application code.
