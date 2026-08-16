# Packages

The curated React-layer package list. The react-components skill routes here for package choices. Anything not React-specific — validation, utilities, logging, testing, HTTP — is owned by the typescript-core skill's packages references; do not pick those here.

Versions are deliberately absent: verify current versions and release health at use-time. Install through the project's package manager wrapped in Socket Firewall when available (`sfw pnpm add …`), and check `package.json` for an installed equivalent before adding anything.

## Defaults by need

| Need | Default | Alternative | Notes |
|---|---|---|---|
| Styling | `tailwindcss` | — | CSS-first workflow: `@import "tailwindcss"` plus `@theme` tokens in CSS; no JS config file. |
| Class strings | `tailwind-merge` | — | Build `cn()` on `twMerge` alone — it accepts conditional (falsy-filtered) arguments, so no separate joiner library. Use `twJoin` when no override conflicts are possible; `twMerge` where caller classes must win. |
| Headless primitives | `radix-ui` | `react-aria` when you own all rendering and want behavior/a11y hooks; `@headlessui/react` for a small Tailwind-native set | Import primitives from the single `radix-ui` package, not per-primitive scoped packages. |
| Icons | `lucide-react` | — | Named imports only, for tree-shaking. |
| Animation | `motion` | — | Import from `motion/react`. Prefer CSS for simple transitions; reach for it for layout/exit animations and gestures. |
| Forms | `react-hook-form` + `@hookform/resolvers` | — | Uncontrolled by default — keep it that way; avoid bare `watch()` of the whole form. Schemas come from the house validation library (typescript-core's call). |
| Server cache | `@tanstack/react-query` | — | It caches server state; it is not a client state manager. Centralize query keys in a key factory. |
| URL state | `nuqs` | — | Filters, tabs, pagination — shareable state belongs in the URL, not a store. |
| Client state | `zustand` | — | One store per domain in `src/stores`; subscribe with selectors. Never mirror server data into it. |
| Table | `@tanstack/react-table` | — | Headless: it computes, you render. |
| Virtualization | `react-window` | `@tanstack/react-virtual` for headless control: dynamic measurement, window scrolling, virtualized `@tanstack/react-table` | `List`/`Grid` component API for the common fixed-height case. |
| Drag and drop | `@dnd-kit/react` | — | The actively released dnd-kit line. Ignore examples and docs written for the legacy core package — the APIs differ. |
| Charts | `recharts` | `visx` when you need low-level SVG primitives and full control | Composable chart components; fine for dashboards without a custom design language. |
| File upload | `react-dropzone` | — | Hook-based; pair with your own presentational dropzone. |
| Positioning | `@floating-ui/react` | — | For custom tooltips/popovers/dropdown surfaces only — radix primitives already position themselves with it internally. |

## Do not use

| Package | Why |
|---|---|
| `@uidotdev/usehooks` | Dead. Write the hook, or use the house utility library (typescript-core's call). |
| `radash` | The house utility library is `es-toolkit` — typescript-core owns that call. |
| `formik` | Superseded in this stack; forms are `react-hook-form`. |
| `react-virtualized` | Dormant; use `@tanstack/react-virtual`. |
| `create-react-app` / `react-scripts` | Dead; scaffold with Vite. |
| `@dnd-kit/core` (and its sortable/modifier satellites) | Dormant line; `@dnd-kit/react` is the live one. |
| `clsx` / `classnames` / `class-variance-authority` | Dormant class-string micro-libs; `twJoin`/`twMerge` from `tailwind-merge` cover conditional joining and variants live in components. |
