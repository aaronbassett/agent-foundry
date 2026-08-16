#!/usr/bin/env node
// Scaffold a feature component: typed query stub, container, four-state view,
// CSF3 stories, and a Vitest + Testing Library test.
//
// Usage: node scaffold-component.mjs <featureName> <ComponentName>
//   <featureName>    camelCase feature directory, e.g. "billing"
//   <ComponentName>  PascalCase component base name, e.g. "RevenueCard"
//
// Run from the project root. Existing files are never overwritten.

import fs from 'node:fs';
import path from 'node:path';

const [featureName, componentName] = process.argv.slice(2);

function fail(...lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

if (!featureName || !componentName) {
  fail(
    'Usage: node scaffold-component.mjs <featureName> <ComponentName>',
    'Example: node scaffold-component.mjs billing RevenueCard',
  );
}

// A single safe path segment: letters and digits only, so separators,
// "..", and every other traversal spelling are rejected outright.
if (!/^[a-z][A-Za-z0-9]*$/.test(featureName)) {
  fail(
    `Invalid featureName "${featureName}".`,
    'Expected a camelCase path segment (letters and digits only), e.g. "userProfile".',
  );
}

if (!/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
  fail(
    `Invalid ComponentName "${componentName}".`,
    'Expected PascalCase (letters and digits only), e.g. "RevenueCard".',
  );
}

const name = componentName;

const queryContent = `import { useEffect, useState } from 'react';

export interface ${name}Data {
  id: string;
  name: string;
}

interface ${name}QueryState {
  data: ${name}Data | null;
  error: Error | null;
  isLoading: boolean;
}

export function use${name}Query(): ${name}QueryState {
  const [state, setState] = useState<${name}QueryState>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        // TODO: replace with the real data source for the ${featureName} feature.
        const data: ${name}Data = { id: 'todo', name: 'TODO' };
        if (!cancelled) setState({ data, error: null, isLoading: false });
      } catch (caught) {
        const error = caught instanceof Error ? caught : new Error(String(caught));
        if (!cancelled) setState({ data: null, error, isLoading: false });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
`;

const containerContent = `import type { ReactElement } from 'react';

import { use${name}Query } from '../api/use${name}Query';
import { ${name}View } from './${name}View';

export function ${name}Container(): ReactElement {
  const { data, error, isLoading } = use${name}Query();

  if (isLoading) return <${name}View state="loading" />;
  if (error) return <${name}View state="error" message={error.message} />;
  if (!data) return <${name}View state="empty" />;

  return <${name}View state="ready" data={data} />;
}
`;

const viewContent = `import type { ReactElement } from 'react';

import type { ${name}Data } from '../api/use${name}Query';

export type ${name}ViewProps =
  | { state: 'loading' }
  | { state: 'empty' }
  | { state: 'error'; message: string }
  | { state: 'ready'; data: ${name}Data };

export function ${name}View(props: ${name}ViewProps): ReactElement {
  switch (props.state) {
    case 'loading':
      return (
        <div role="status" className="p-4 text-center text-gray-500">
          Loading…
        </div>
      );
    case 'empty':
      return <div className="p-4 text-center text-gray-500">Nothing here yet.</div>;
    case 'error':
      return <div className="p-4 text-center text-red-600">{props.message}</div>;
    case 'ready':
      return (
        <div className="rounded-lg border p-4 shadow-sm">
          <h2 className="text-xl font-semibold">{props.data.name}</h2>
          <p className="text-gray-600">ID: {props.data.id}</p>
        </div>
      );
    default: {
      const unreachable: never = props;
      throw new Error(\`Unhandled state: \${JSON.stringify(unreachable)}\`);
    }
  }
}
`;

const storiesContent = `import type { Meta, StoryObj } from '@storybook/react-vite';

import { ${name}View } from './${name}View';

const meta = {
  title: 'Features/${featureName}/${name}View',
  component: ${name}View,
  tags: ['autodocs'],
} satisfies Meta<typeof ${name}View>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { state: 'loading' } };

export const Empty: Story = { args: { state: 'empty' } };

export const ErrorState: Story = {
  name: 'Error',
  args: { state: 'error', message: 'Something went wrong.' },
};

export const Ready: Story = {
  args: { state: 'ready', data: { id: 'demo-1', name: 'Demo' } },
};
`;

const testContent = `/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ${name}View } from './${name}View';

afterEach(cleanup);

describe('${name}View', () => {
  it('renders the loading state with a status role', () => {
    render(<${name}View state="loading" />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('renders the empty state', () => {
    render(<${name}View state="empty" />);
    expect(screen.getByText('Nothing here yet.')).toBeDefined();
  });

  it('renders the error message', () => {
    render(<${name}View state="error" message="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeDefined();
  });

  it('renders the ready state', () => {
    render(<${name}View state="ready" data={{ id: 'demo-1', name: 'Demo' }} />);
    expect(screen.getByText('Demo')).toBeDefined();
  });
});
`;

const featureRoot = path.join(process.cwd(), 'src', 'features', featureName);
const apiDir = path.join(featureRoot, 'api');
const componentsDir = path.join(featureRoot, 'components');

const targets = [
  { filePath: path.join(apiDir, `use${name}Query.ts`), content: queryContent },
  { filePath: path.join(componentsDir, `${name}Container.tsx`), content: containerContent },
  { filePath: path.join(componentsDir, `${name}View.tsx`), content: viewContent },
  { filePath: path.join(componentsDir, `${name}View.stories.tsx`), content: storiesContent },
  { filePath: path.join(componentsDir, `${name}View.test.tsx`), content: testContent },
];

const existing = targets.filter(target => fs.existsSync(target.filePath));
if (existing.length > 0) {
  fail(
    'Refusing to overwrite existing files:',
    ...existing.map(target => `  ${target.filePath}`),
    'Move or delete them first, or pick a different ComponentName.',
  );
}

try {
  fs.mkdirSync(apiDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  for (const target of targets) {
    fs.writeFileSync(target.filePath, target.content, { flag: 'wx' });
    console.log(`Created ${path.relative(process.cwd(), target.filePath)}`);
  }
} catch (error) {
  fail(`Scaffolding failed: ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`\nScaffolded ${name} in src/features/${featureName}.`);
console.log(`Next: implement use${name}Query and replace the placeholder ${name}Data fields.`);
