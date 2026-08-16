# React Idioms

`useActionState`, `useOptimistic`, `use`, `Activity`, `useEffectEvent`, and `cacheSignal` are `react` exports; `useFormStatus` and the preload APIs (`preload`, `preinit`, …) live in `react-dom`.

## Actions

`<form action={fn}>` runs `fn` in a transition with the form's `FormData`. `useActionState` wraps an action with result state; `useFormStatus` reads the nearest form's pending state from any child; `useOptimistic` renders an update immediately and reverts it automatically when the action settles.

```tsx
import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus(); // reads the nearest <form action>
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

export function Comments({
  comments,
  save,
}: {
  comments: string[];
  save: (text: string) => Promise<void>;
}) {
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (current, next: string) => [...current, next],
  );
  const [error, formAction] = useActionState(
    async (_prev: string | null, data: FormData) => {
      const text = data.get('text') as string;
      addOptimistic(text); // shown immediately; reverts if save throws
      try {
        await save(text);
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    },
    null,
  );
  return (
    <form action={formAction}>
      <input name="text" />
      <SubmitButton />
      {error && <p role="alert">{error}</p>}
      <ul>
        {optimistic.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </form>
  );
}
```

## `use`

`use` reads a promise (suspending until it resolves) or a context — and unlike hooks it is legal in conditionals and loops. Create promises in caches, loaders, or a parent, never during the consuming component's render (that recreates and re-suspends every pass). A context object renders directly as its own provider.

```tsx
import { Suspense, createContext, use } from 'react';

const Theme = createContext('light');

function Profile({ userPromise }: { userPromise: Promise<{ name: string }> }) {
  const user = use(userPromise); // suspends until resolved
  const theme = use(Theme); // legal in conditionals and loops, unlike useContext
  return <p className={theme}>{user.name}</p>;
}

export function Page({ userPromise }: { userPromise: Promise<{ name: string }> }) {
  return (
    <Theme value="dark">
      {/* a context object renders directly as its own provider */}
      <Suspense fallback={<p>Loading…</p>}>
        <Profile userPromise={userPromise} />
      </Suspense>
    </Theme>
  );
}
```

## `ref` as a prop

Function components take `ref` as an ordinary prop (`ComponentProps<'input'>` already includes it) — no `forwardRef`. A callback ref may return a cleanup function, which then replaces the call-with-`null` on detach.

```tsx
import type { ComponentProps } from 'react';

function Input(props: ComponentProps<'input'>) {
  return <input {...props} />; // ref arrives as a normal prop — no forwardRef
}

export function SearchInput({ onKey }: { onKey: (key: string) => void }) {
  return (
    <Input
      ref={(node) => {
        if (!node) return;
        const listener = (e: KeyboardEvent) => onKey(e.key);
        node.addEventListener('keydown', listener);
        // returning a cleanup means React never calls this ref with null
        return () => node.removeEventListener('keydown', listener);
      }}
    />
  );
}
```

## `Activity`

`<Activity mode="hidden">` keeps children mounted with state and DOM preserved (hidden via `display: none`) while their effects are unmounted. Use it for tabs, back/forward UI, and pre-rendering likely-next screens.

```tsx
import { Activity, type ReactNode } from 'react';

export function Tabs({ active, panels }: { active: string; panels: Record<string, ReactNode> }) {
  return Object.entries(panels).map(([id, panel]) => (
    <Activity key={id} mode={id === active ? 'visible' : 'hidden'}>
      {panel}
    </Activity>
  ));
}
```

## `useEffectEvent`

Extracts the non-reactive part of an effect: the returned function always sees the latest props and state but is not a dependency, so the effect stops re-firing on values it merely reads. Call it only from inside effects; never pass it around or list it in deps.

```tsx
import { useEffect, useEffectEvent, useState } from 'react';

export function Ticker({ intervalMs, label }: { intervalMs: number; label: string }) {
  const [log, setLog] = useState<string[]>([]);
  const onTick = useEffectEvent(() => setLog((l) => [...l, label])); // always reads latest label
  useEffect(() => {
    const id = setInterval(onTick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]); // label changes do not reset the interval
  return (
    <ol>
      {log.map((entry, i) => (
        <li key={i}>{entry}</li>
      ))}
    </ol>
  );
}
```

In Server Components, `cacheSignal()` returns the `AbortSignal` for the current `cache()` lifetime — pass it to `fetch` so abandoned renders cancel their requests; outside one (including all client code) it returns `null`.

## You might not need an effect

Derived data is render-time code: `const visible = todos.filter((t) => !t.done)` — no state, no effect. Logic triggered by an interaction belongs in that event handler, not an effect watching state. Subscribing to anything external is `useSyncExternalStore`, not `useEffect` + `setState`:

```ts
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
```

## React Compiler

`babel-plugin-react-compiler` is a standalone, opt-in Babel plugin — nothing inside `react` compiles anything by default. It rewrites component and hook bodies to cache values, callbacks, and JSX in a per-component memo cache (`react/compiler-runtime`), recomputing only slots whose inputs changed. It does **not** wrap components in `React.memo`: children re-render less because a compiled parent reuses cached JSX elements, which React bails out on. For Vite, `@vitejs/plugin-react` exports `reactCompilerPreset`, consumed by `@rolldown/plugin-babel` (requires `@babel/core`); pass `{ compilationMode: 'annotation' }` to compile only `"use memo"` components.

```ts
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
```
