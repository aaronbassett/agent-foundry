---
name: devs:react-core
description: "Use when building or debugging React applications — component and hook idioms, rendering and re-render performance, state architecture, data fetching, application security, project architecture, or choosing React-ecosystem packages. Contains runtime-verified references, a curated React package list, and verified Vite/ESLint config templates. Language, tsconfig, and test tooling belong to devs:typescript-core; the house component-authoring style belongs to devs:react-components."
---

# React Core Development

Reference hub for React application work. Verify package versions and APIs against npm and installed types — never from trained knowledge.

## Reference routing

Load references on demand — not all at once.

| Reference | Use when |
|---|---|
| [react-idioms.md](references/react-idioms.md) | Current component model: Actions, use(), refs, context, effects discipline, React Compiler |
| [state-management.md](references/state-management.md) | Choosing where state lives — the decision ladder |
| [data-fetching.md](references/data-fetching.md) | Typed fetch layer, TanStack Query patterns, auth-token handling |
| [performance.md](references/performance.md) | Code splitting, memoization in the compiler era, virtualization, web vitals |
| [security.md](references/security.md) | XSS/sanitization (canonical), auth storage, CSRF, CSP, headers, env vars |
| [architecture.md](references/architecture.md) | Feature-based layout, enforced feature boundaries, public-API rule |
| [packages.md](references/packages.md) | The curated React-layer package list with a do-not-use table |

## Boundaries

- **devs:typescript-core** owns language, tsconfig (its `strict-react.json` template), ESLint flat-config mechanics, vitest + Testing Library setup, dependency workflow, and non-React packages.
- **devs:react-components** owns the house authoring style: container/presenter, the four-state contract, headless patterns, forms convention, Storybook, and the component scaffold script.
- Framework-specific servers (Next.js, react-router framework mode) follow their framework docs; these references cover the React layer itself.

## Decision guides

**State:** local → derive during render → URL (nuqs) → server cache (TanStack Query) → global client state (zustand, sparingly). Details: [state-management.md](references/state-management.md).

**Data:** never fetch in `useEffect`; never mirror query data into client state. Details: [data-fetching.md](references/data-fetching.md).

**Packages:** check `package.json` for an installed equivalent before adding anything; the installed stack is the convention. Selection: [packages.md](references/packages.md). Install via the project's package manager wrapped in Socket Firewall when available (`sfw pnpm add …`).

## Config templates (`${CLAUDE_SKILL_DIR}/assets/config-templates/`)

- `vite.config.ts` — deliberately minimal (Vite's defaults beat hand-tuning; no manual chunking), `@` alias, commented React Compiler pointer. Verified by building.
- `eslint.react.config.js` — flat config: typescript-eslint strict + @eslint-react + eslint-plugin-react-hooks with the conflict-resolving preset; the lint toolchain pins typescript 6.x (typescript-eslint peer range) while tsc 7 compiles. Verified by linting a rules-of-hooks violation.
