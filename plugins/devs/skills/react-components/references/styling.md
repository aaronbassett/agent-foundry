# Styling

The house styling contract. Package choices and their rationale live in the react-core skill's packages reference; this file is how those choices are used.

## Tailwind v4, CSS-first

Theme configuration lives in CSS — there is no `tailwind.config.js`. `styles/globals.css` imports Tailwind and declares design tokens with `@theme`; each token generates the matching utilities:

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.55 0.2 260);
  --font-display: "Inter", sans-serif;
}
```

`--color-brand` yields `bg-brand`, `text-brand`, `border-brand`, and friends; `--font-display` yields `font-display`.

**Token discipline:** never hardcode a value that has a token. `bg-[#5560c9]` when `bg-brand` exists is a defect — arbitrary values are for genuinely one-off measurements, not for bypassing the palette.

**Responsive:** mobile-first. Base classes describe the smallest layout; `sm:`/`md:`/`lg:`/`xl:` prefixes layer changes on top.

## The `cn()` utility

One utility joins conditional classes and resolves Tailwind conflicts, built on `tailwind-merge` alone:

```ts
// src/lib/cn.ts
import { twMerge } from "tailwind-merge";

export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(...classes);
}
```

`twMerge` filters falsy arguments (so `isActive && "font-bold"` works directly) and resolves conflicts in favor of the **last** class — which is what makes caller overrides work:

```tsx
<div className={cn("px-2 text-red-500", className)} />
// caller passing className="px-4" gets px-4, not a px-2/px-4 fight
```

Use `twJoin` (same package) only where conflict resolution must not apply — e.g. joining classes that intentionally repeat a group.

## Variants without a variant library

Variant classes are a plain object in the component; `cn()` composes base, variant, and caller override in that order:

```tsx
const variants = {
  primary: "bg-brand text-white",
  ghost: "bg-transparent",
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn("rounded px-4 py-2", variants[variant], className)}
      {...props}
    />
  );
}
```

The `keyof typeof variants` prop type keeps the variant set and its classes in one place — adding a variant is one line, and an invalid variant is a type error.

## Component libraries

Headless primitives (radix-ui and friends — see react-core's packages reference) ship no styles; style them with the same tokens and `cn()` as everything else. A styled component exposes `className` and merges it last, so consumers can adjust spacing or color without forking the component.
