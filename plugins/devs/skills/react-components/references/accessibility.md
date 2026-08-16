# Accessibility

The floor for every component. A component that fails this file is not done, whatever else works.

## Semantic Elements First

Use the element that already does the job: `<button>` for actions, `<a>` for navigation, `<label>` for inputs, `<nav>`/`<main>`/`<header>`/`<footer>` for landmarks, `<h1>`–`<h6>` in order without skipping levels. Never a `div` with a role where a real element exists — a `div role="button"` needs `tabIndex`, keydown handling, and announcements that `<button>` ships for free.

```tsx
// Wrong: re-implementing a button
<div role="button" tabIndex={0} onClick={save} onKeyDown={handleKey}>Save</div>

// Right
<button onClick={save}>Save</button>
```

ARIA is for what semantics cannot express (composite widgets — see [headless-components.md](headless-components.md)); no ARIA is better than bad ARIA, and Radix primitives wire it for you.

## Keyboard

Every interactive element must be reachable and operable by keyboard alone: `Tab`/`Shift+Tab` through, `Enter`/`Space`/arrows to operate, no traps. Focus must be visible — style `:focus-visible` (Tailwind's `focus-visible:` utilities) and never remove an outline without replacing it. Overlays trap focus while open and return it to the trigger on close; use Radix `Dialog`/`Popover` rather than hand-rolling that.

## Accessible Names

Every control has a name: a visible `<label htmlFor>` matched to the input's `id` (a placeholder is not a label), text content for buttons and links, `aria-label` only for icon-only controls. Error text is linked with `aria-describedby` and announced with `role="alert"` ([forms.md](forms.md)).

## Enforcement

Role-based Testing Library queries are the enforcement mechanism: query by role and accessible name — `getByRole("button", { name: "Save" })`. When a test cannot find an element that way, fix the markup, not the query. Suites written this way fail the moment semantics regress.

For visual review, enable the `@storybook/addon-a11y` addon (setup in [storybook.md](storybook.md)): every story gets an automated axe audit, so the four canonical states ([patterns.md](patterns.md)) each get checked.

Automated checks catch a minority of issues. Before calling a component done, keyboard-walk it end to end — visible focus at every stop, logical order, no traps — and spot-check with a screen reader (VoiceOver, Narrator).
