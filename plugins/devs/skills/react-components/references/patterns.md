# Component Patterns

The house contract for authoring components. Runtime and architecture concerns (state management, data fetching, performance) belong to the react-core skill; language and test mechanics belong to typescript-core.

## Container/Presenter Split

Every feature component is a file triad:

```
src/features/<feature>/components/
├─ <Name>Container.tsx        # owns data: hooks, queries, callbacks
├─ <Name>View.tsx             # pure: props in, JSX out
└─ <Name>View.stories.tsx     # one story per canonical state
```

Generate it with the scaffold script, run from the project root (alongside the triad it also emits a query-hook stub under `api/` and a View test):

```bash
node ${CLAUDE_SKILL_DIR}/scripts/scaffold-component.mjs <featureName> <ComponentName>
```

- **Container** — calls hooks and queries, decides which state the View is in, passes data down. No markup beyond rendering the View.
- **View** — renders from props alone. No data fetching, no side effects, no async. Testable and storybookable in isolation.
- **Custom hooks** — reusable logic, no JSX.

## The Four Canonical States

Every View models exactly four states — `loading`, `empty`, `error`, `ready` — as a discriminated union prop. Do not invent new ones; a new variant belongs inside one of the four. Every View handles all four; stories cover all four.

```tsx
interface RevenueData {
  value: number;
  previousValue: number;
}

type RevenueCardViewProps =
  | { state: "loading" }
  | { state: "empty"; message: string }
  | { state: "error"; message: string }
  | { state: "ready"; data: RevenueData };

export function RevenueCardView(props: RevenueCardViewProps) {
  switch (props.state) {
    case "loading":
      return <p role="status">Loading revenue…</p>;
    case "empty":
      return <p role="status">{props.message}</p>;
    case "error":
      return <p role="alert">{props.message}</p>;
    case "ready":
      return <p>{props.data.value.toLocaleString()}</p>;
  }
}

// Declared here for the example — in real code this is the feature's query hook.
declare function useRevenueQuery(): {
  data: RevenueData | undefined;
  error: Error | null;
  isLoading: boolean;
};

export function RevenueCardContainer() {
  const { data, error, isLoading } = useRevenueQuery();

  if (isLoading) return <RevenueCardView state="loading" />;
  if (error) return <RevenueCardView state="error" message="Revenue unavailable" />;
  if (!data) return <RevenueCardView state="empty" message="No revenue yet" />;
  return <RevenueCardView state="ready" data={data} />;
}
```

The union makes illegal states unrepresentable: only `ready` carries data, `empty` and `error` carry a message, and the exhaustive switch turns an unhandled state into a type error.

Stories mirror the union:

```tsx
// RevenueCardView.stories.tsx
export const Loading = { args: { state: "loading" } };
export const Empty = { args: { state: "empty", message: "No revenue yet" } };
export const ErrorState = { args: { state: "error", message: "Revenue unavailable" } };
export const Ready = { args: { state: "ready", data: { value: 124500, previousValue: 110600 } } };
```

For interactive stories, MDX docs, and mocking the container's queries, see [storybook.md](storybook.md).

## Composition Rules

- **Children and slots over prop explosion.** When props multiply to configure sub-parts (toolbar options, footer options, per-region renderers), split the component into composable parts — `Table.Toolbar`, `Table.Body`, `Table.Pagination` — and let consumers arrange JSX instead of memorising prop interactions. See [headless-components.md](headless-components.md) for compound components.
- **Controlled vs uncontrolled.** A stateful prop is either controlled (`value` + `onChange` owned by the parent) or uncontrolled (`defaultValue` + internal state) — support one or both pairs, never a hybrid.
- **Naming.** Event props are `on<Event>` (`onValueChange`); internal handlers are `handle<Event>`; the props type is `<Component>Props`.

## UI Source Priority

1. Existing components in `components/ui`
2. Installed primitives — check `package.json`; the installed stack is the convention
3. Composition of existing components
4. New component — last resort; if it must be new, build it headless ([headless-components.md](headless-components.md))

Never introduce additional UI libraries; package choices are owned by the react-core packages reference.
