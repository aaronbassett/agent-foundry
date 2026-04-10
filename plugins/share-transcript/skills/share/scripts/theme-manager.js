/**
 * theme-manager.js — Built-in and custom theme management for share-transcript.
 *
 * Storage layout:
 *   templatesDir/
 *   └── themes/
 *       ├── minimal.css
 *       └── blueprint.css
 *
 *   dataDir/
 *   └── custom-themes/
 *       └── retro.css
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── Helpers ───────────────────────────────────────────────────────────────────

function builtinThemesDir(templatesDir) {
  return join(templatesDir, 'themes');
}

function customThemesDir(dataDir) {
  return join(dataDir, 'custom-themes');
}

function stripCssExt(filename) {
  return filename.endsWith('.css') ? filename.slice(0, -4) : filename;
}

// ── Built-in themes ───────────────────────────────────────────────────────────

/**
 * List all built-in theme names from the templates directory.
 *
 * @param {string} templatesDir
 * @returns {string[]}
 */
export function listBuiltinThemes(templatesDir) {
  const dir = builtinThemesDir(templatesDir);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((f) => f.endsWith('.css'))
    .map(stripCssExt);
}

// ── Custom themes ─────────────────────────────────────────────────────────────

/**
 * List all custom theme names from the data directory.
 *
 * @param {string} dataDir
 * @returns {string[]}
 */
export function listCustomThemes(dataDir) {
  const dir = customThemesDir(dataDir);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((f) => f.endsWith('.css'))
    .map(stripCssExt);
}

/**
 * Save a custom theme to dataDir, creating the directory if needed.
 *
 * @param {string} dataDir
 * @param {string} name
 * @param {string} css
 */
export function saveCustomTheme(dataDir, name, css) {
  const dir = customThemesDir(dataDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.css`), css, 'utf8');
}

// ── Theme CSS retrieval ───────────────────────────────────────────────────────

/**
 * Get the CSS for a theme by name.
 * Custom themes take precedence over built-in themes of the same name.
 * Returns null if the theme is not found.
 *
 * @param {string} name
 * @param {string} templatesDir
 * @param {string} dataDir
 * @returns {string|null}
 */
export function getThemeCSS(name, templatesDir, dataDir) {
  // Check custom themes first
  const customPath = join(customThemesDir(dataDir), `${name}.css`);
  try {
    return readFileSync(customPath, 'utf8');
  } catch {
    // fall through to built-in
  }

  // Check built-in themes
  const builtinPath = join(builtinThemesDir(templatesDir), `${name}.css`);
  try {
    return readFileSync(builtinPath, 'utf8');
  } catch {
    return null;
  }
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('theme-manager.js')) {
  const args = process.argv.slice(2);
  const subcommand = args[0];

  const getFlag = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const templatesDir = getFlag('--templates-dir');
  const dataDir = getFlag('--data-dir');
  const name = getFlag('--name');
  const css = getFlag('--css');

  switch (subcommand) {
    case 'list-builtin': {
      if (!templatesDir) {
        process.stderr.write('Error: --templates-dir is required\n');
        process.exit(1);
      }
      const themes = listBuiltinThemes(templatesDir);
      process.stdout.write(JSON.stringify(themes) + '\n');
      break;
    }
    case 'list-custom': {
      if (!dataDir) {
        process.stderr.write('Error: --data-dir is required\n');
        process.exit(1);
      }
      const themes = listCustomThemes(dataDir);
      process.stdout.write(JSON.stringify(themes) + '\n');
      break;
    }
    case 'get': {
      if (!templatesDir || !dataDir) {
        process.stderr.write('Error: --templates-dir and --data-dir are required\n');
        process.exit(1);
      }
      if (!name) {
        process.stderr.write('Error: --name is required\n');
        process.exit(1);
      }
      const result = getThemeCSS(name, templatesDir, dataDir);
      if (result === null) {
        process.stderr.write(`Error: theme "${name}" not found\n`);
        process.exit(1);
      }
      process.stdout.write(result);
      break;
    }
    case 'save-custom': {
      if (!dataDir) {
        process.stderr.write('Error: --data-dir is required\n');
        process.exit(1);
      }
      if (!name) {
        process.stderr.write('Error: --name is required\n');
        process.exit(1);
      }
      if (!css) {
        process.stderr.write('Error: --css is required\n');
        process.exit(1);
      }
      saveCustomTheme(dataDir, name, css);
      process.stdout.write(JSON.stringify({ ok: true }) + '\n');
      break;
    }
    default: {
      process.stderr.write(`Unknown subcommand: ${subcommand}\n`);
      process.stderr.write('Usage: theme-manager.js <list-builtin|list-custom|get|save-custom> --templates-dir <dir> --data-dir <dir> [--name <name>] [--css <css>]\n');
      process.exit(1);
    }
  }
}
