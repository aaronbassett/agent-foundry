# Storybook

Storybook renders the four canonical view states from [patterns.md](patterns.md) — loading, empty, error, ready — as living, testable documentation. Every import below resolves against the installed packages; nothing here is from memory.

## Setup

```bash
npm install --save-dev storybook @storybook/react-vite @storybook/addon-docs @storybook/addon-a11y
```

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite'

export default {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
} satisfies StorybookConfig
```

## CSF3 stories

`Meta`/`StoryObj` come from the framework package; test utilities (`expect`, `fn`, `userEvent`, `within`) from the `storybook/test` subpath; the imperative `action` logger from `storybook/actions`. This file type-checks under strict TypeScript against the installed types:

```tsx
// src/components/RevenueCardView.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'

import { RevenueCardView } from './RevenueCardView'

const meta = {
  title: 'Features/Revenue/RevenueCardView',
  component: RevenueCardView,
  tags: ['autodocs'],
} satisfies Meta<typeof RevenueCardView>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { args: { state: 'loading' } }

export const Empty: Story = { args: { state: 'empty', message: 'No revenue yet' } }

const onRetry = fn()

export const ErrorState: Story = {
  name: 'Error',
  args: { state: 'error', message: 'Revenue unavailable', onRetry },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /retry/i }))
    await expect(onRetry).toHaveBeenCalledOnce()
  },
}

export const Ready: Story = {
  args: { state: 'ready', value: 124_500, previousValue: 110_600 },
}
```

- `satisfies Meta<typeof RevenueCardView>` keeps every story's `args` checked against the view's discriminated union — a story cannot pair `state: 'loading'` with `message`.
- Capture exactly the four canonical states; do not invent others.
- The `play` context provides a queryable `canvas`. Hoist `fn()` spies to named constants so assertions need no union narrowing; spy calls also appear in the Actions panel.
- `tags: ['autodocs']` generates a docs page per component.

## MDX docs pages

Docs blocks come from `@storybook/addon-docs/blocks`:

````mdx
{/* src/components/RevenueCard.mdx */}
import { Canvas, Controls, Meta, Primary } from '@storybook/addon-docs/blocks'
import * as Stories from './RevenueCardView.stories'

<Meta of={Stories} />

# RevenueCard

Shows current revenue against the previous period.

```tsx
import { RevenueCardView } from '@/components/RevenueCardView'
```

<Primary />
<Controls />

## States

<Canvas of={Stories.Loading} />
<Canvas of={Stories.ErrorState} />
````

## Accessibility

`@storybook/addon-a11y` runs axe against every story. Set `parameters.a11y.test` to `'todo'` (annotate violations) or `'error'` (fail the story, and CI test runs) globally in `preview.ts` or per story; scope checks with `a11y.context` and tune rules with `a11y.options`.

## Network states with MSW

Presenter stories never need mocking — state arrives as props. Container stories mock the network with `msw-storybook-addon` (`msw` itself is a peer dependency you install alongside it). It requires one-time initialization: generate the worker script with `npx msw init public/ --save`, then register the loader for CSF3 projects:

```ts
// .storybook/preview.ts
import type { Preview } from '@storybook/react-vite'
import { mswLoader } from 'msw-storybook-addon/csf3'

export default {
  loaders: [mswLoader()],
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Preview
```

Provide handlers per story through `parameters.msw`:

```tsx
import { delay, http, HttpResponse } from 'msw'

export const Ready: Story = {
  parameters: {
    msw: [http.get('/api/revenue', () => HttpResponse.json({ id: 'r-1', name: 'Q3' }))],
  },
}

export const Loading: Story = {
  parameters: {
    msw: [
      http.get('/api/revenue', async () => {
        await delay('infinite')
        return HttpResponse.json(null)
      }),
    ],
  },
}
```

Add `"types": ["msw-storybook-addon/csf3"]` to `tsconfig.json` for a typed `parameters.msw`.

## Organizing stories

Use `Category/Feature/ComponentName` titles — `Features/Revenue/RevenueCardView`, `UI/Primitives/Button` — so the sidebar nests instead of sprawling.
