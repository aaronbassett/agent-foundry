# Packages – CLI Development

Our standard stack for command-line tools.

## Choosing a framework

| Framework | Verified | Pick when | Gotcha |
| --- | --- | --- | --- |
| `@oclif/core` | 4.13.5 | Multi-command CLIs with plugins, generated help, autoupdate — **our default** | Compile TS before publishing. |
| `commander` | 15.0.0 | Small single-purpose tools with a minimal dependency budget | No prompts/UI — pair with `@inquirer/prompts`. |
| `citty` | 0.2.2 | Lightweight subcommand CLIs in the unjs style | Pre-1.0 API. |
| `clipanion` | 4.0.0-rc.4 | Only when extending Yarn-ecosystem tooling | Dormant: stable 3.2.1 dates from 2023-06 and v4 has sat at RC since 2024-09. Avoid for new work. |

## Oclif

Commands live in `src/commands`, one class per file; folders become topics (`commands/user/create.ts` → `mycli user:create`). Define `description`, `flags`, and `args` as statics so help text stays complete. Use hooks for init/teardown and `catch` for user-friendly errors.

```ts
import { Command, Flags } from '@oclif/core';

export class Hello extends Command {
  static description = 'Prints a hello message';
  static flags = {
    name: Flags.string({ char: 'n', description: 'name to greet', required: true }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Hello);
    this.log(`Hello, ${flags.name}!`);
  }
}
```

`mycli hello -n Alice` → `Hello, Alice!`.

## Companion packages

| Package | Verified | When | Gotcha |
| --- | --- | --- | --- |
| `ink` | 7.1.1 | Dynamic or rich terminal UI as React components | Peer-requires `react` >= 19.2; JSX means `.tsx` files. |
| `@inquirer/prompts` | 8.5.2 | Confirmations, selects, text/password input | The modern surface: named prompt functions, one options object each. |
| `ora` | 9.4.1 | One-line spinners for indeterminate waits | ESM-only. |
| `listr2` | 11.0.0 | Multi-step task lists with per-task progress | — |

## Prompts — `@inquirer/prompts`

```ts
import { confirm, select } from '@inquirer/prompts';

const proceed = await confirm({ message: 'Proceed with deletion?', default: false });
if (!proceed) process.exit(0);

export const env = await select({
  message: 'Deploy to',
  choices: [
    { name: 'Staging', value: 'staging' },
    { name: 'Production', value: 'prod' },
  ],
});
```

## Ink

Use Ink when output is dynamic (live status, wizards) or needs layout (`<Box>` flexbox). Maintained companions: `ink-text-input`, `ink-select-input`, `ink-spinner`.

```tsx
import { render, Text } from 'ink';
import { useEffect, useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCount((c) => c + 1), 100);
    return () => clearInterval(timer);
  }, []);
  return <Text color="green">Counter: {count}</Text>;
};

render(<Counter />);
```

Ink exits when the component tree unmounts. **Warning**: Ink and `@inquirer/prompts` both take over stdin — never run a prompt while an Ink app is mounted.

## Spinners and progress

```ts
import ora from 'ora';

declare function uploadAll(): Promise<void>;

const spinner = ora('Uploading files').start();
try {
  await uploadAll();
  spinner.succeed('Uploaded');
} catch (error) {
  spinner.fail('Upload failed');
  throw error;
}
```

For determinate, multi-step progress use `listr2` task lists, or render a bar yourself in Ink. Avoid interleaving normal log output with an active spinner or bar.

## Do not reach for

- Legacy `inquirer` `prompt([{ type, name, … }])` array API → `@inquirer/prompts` named functions.
- `cli-progress` → unmaintained (last publish 2023-04) → `listr2` or an Ink component.
- `ink-table` → frozen since 2023-12, never validated against Ink 7 → `<Box>`/`<Text>` layout.
