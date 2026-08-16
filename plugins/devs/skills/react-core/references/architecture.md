# Architecture

How a React application is laid out and how its boundaries are enforced. Component-file conventions inside a folder (the Container/View/stories triad) belong to the react-components skill; this reference owns everything from the folder level up.

## Canonical tree

```
src/
├── app/                  # composition root: entry, router, providers, layouts
├── features/             # one folder per business domain
│   └── <feature>/
│       ├── components/   # feature-private components
│       ├── api/          # feature-private data access (queries, mutations)
│       ├── hooks/        # feature-private hooks
│       └── index.ts      # public API — the only importable surface
├── components/
│   └── ui/               # shared presentational components
├── hooks/                # shared, domain-agnostic hooks
├── lib/                  # third-party client setup (query client, API client)
├── stores/               # global client-state stores
└── types/                # shared types
```

This tree is canonical — the react-components skill aligns to it, and the ESLint config below assumes it.

## Dependency direction

One-way flow: `app → features → shared`.

- `src/app` composes features and shared code; nothing imports from `src/app`.
- A feature imports shared code freely, and other features only through their public API: `src/features/<other>/index.ts`. Deep imports into another feature's internals are forbidden.
- Shared code (`components/ui`, `hooks`, `lib`, `stores`, `types`) never imports from `src/features` or `src/app`. A ui component that needs feature knowledge is a feature component — move it.
- Everything a feature does not export from `index.ts` is private. Keep the index deliberate: re-exporting everything reintroduces coupling and hurts tree-shaking.

## Enforcement

Boundaries only hold when linted. `import-x/no-restricted-paths` from `eslint-plugin-import-x` enforces both rules; feature zones are generated from the directory listing, so new features are covered without touching the config. Verified against this exact config: a deep feature→feature import and a ui→feature import each error; a public-API cross-feature import passes clean.

```js
// eslint.config.js
import fs from 'node:fs';
import { defineConfig } from 'eslint/config';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tseslint from 'typescript-eslint';

const features = fs
  .readdirSync(new URL('src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export default defineConfig([
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [importX.flatConfigs.recommended, importX.flatConfigs.typescript],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.json' }),
      ],
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: ['./src/components', './src/hooks', './src/lib', './src/stores', './src/types'],
              from: ['./src/features', './src/app'],
              message: 'Shared code must not depend on features or the app layer.',
            },
            {
              target: './src/features',
              from: './src/app',
              message: 'Features must not import from the composition root.',
            },
            ...features.map((feature) => ({
              target: `./src/features/${feature}`,
              from: './src/features',
              except: [
                `./${feature}`,
                ...features
                  .filter((other) => other !== feature)
                  .map((other) => `./${other}/index.ts`),
              ],
              message: 'Import other features only through their public API (index.ts).',
            })),
          ],
        },
      ],
    },
  },
]);
```

The TypeScript resolver reads `@/*` aliases from `tsconfig.json` `paths` — keep that the single source of alias truth (mirror it in the bundler config, never redefine it).

## Larger layouts

- Monorepo/workspace layout: owned by the typescript-core skill's project-structure reference.
- `package.json` exports maps for internal packages: same reference.
- TypeScript project references: same reference.
