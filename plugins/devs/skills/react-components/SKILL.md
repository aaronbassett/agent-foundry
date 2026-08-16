---
name: devs:react-components
description: "Use when creating or reviewing React components to the house style — container/presenter structure, the four-canonical-states contract, Tailwind styling and the cn() utility, headless component patterns, form implementation, component accessibility, Storybook stories, or component error boundaries. Includes a verified scaffold script for the component file triad. React runtime/architecture knowledge belongs to devs:react-core; language and test tooling to devs:typescript-core."
---

# React Components — House Style

The authoring contract for components in this codebase family. Verify package facts against npm and installed types — never from trained knowledge.

## The contract in one paragraph

Components split into a Container (data: hooks, queries, callbacks) and a View (pure props-in/JSX-out). Views model exactly four canonical states — loading, empty, error, ready — as a discriminated union; every View handles all four and stories cover all four. Interactive elements are real elements with accessible names, and tests query by role.

## Reference routing

| Reference | Use when |
|---|---|
| [patterns.md](references/patterns.md) | The container/presenter contract, four-state union, composition rules |
| [styling.md](references/styling.md) | Tailwind v4 CSS-first tokens, the `cn()` utility, variants without a variant library |
| [headless-components.md](references/headless-components.md) | Building headless primitives: compound components, asChild, keyboard support |
| [forms.md](references/forms.md) | React Hook Form + zod house pattern and file convention |
| [accessibility.md](references/accessibility.md) | The a11y floor for every component |
| [storybook.md](references/storybook.md) | CSF3 stories, play functions, docs, network states |
| [error-handling.md](references/error-handling.md) | Error boundaries, classification into the four-state contract |
| [web3-ui.md](references/web3-ui.md) | ONLY for dapp work: addresses, token amounts, approvals, secret display |

## Boundaries

- **devs:react-core** owns runtime idioms, state/data architecture, application security (XSS canonical), project layout, and the React package list.
- **devs:typescript-core** owns test mechanics (vitest, Testing Library, userEvent), language, and generic packages.
- Package selection: check `package.json` first — the installed stack is the convention; then react-core's `packages.md`.

## Scaffold script

`node ${CLAUDE_SKILL_DIR}/scripts/scaffold-component.mjs <featureName> <ComponentName>` — generates the api-hook stub, Container, four-state View, stories, and test under `src/features/<featureName>/`; validates names, and refuses to overwrite existing files. Generated code passes strict typecheck and its generated test.
