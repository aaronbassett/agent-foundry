import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  listBuiltinThemes, listCustomThemes, getThemeCSS, saveCustomTheme
} = await import(join(__dirname, '..', 'theme-manager.js'));

let templatesDir;
let dataDir;

beforeEach(() => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  templatesDir = join(tmpdir(), `themes-builtin-${id}`);
  dataDir = join(tmpdir(), `themes-custom-${id}`);
  mkdirSync(join(templatesDir, 'themes'), { recursive: true });
  mkdirSync(dataDir, { recursive: true });

  writeFileSync(join(templatesDir, 'themes', 'minimal.css'), 'body { font-family: sans-serif; }');
  writeFileSync(join(templatesDir, 'themes', 'blueprint.css'), 'body { font-family: monospace; }');
});

describe('theme-manager', () => {
  it('lists built-in themes from templates directory', () => {
    const themes = listBuiltinThemes(templatesDir);
    assert.ok(themes.includes('minimal'));
    assert.ok(themes.includes('blueprint'));
  });

  it('lists custom themes (empty initially)', () => {
    assert.deepEqual(listCustomThemes(dataDir), []);
  });

  it('saves and lists custom themes', () => {
    saveCustomTheme(dataDir, 'retro', 'body { background: black; color: green; }');
    const themes = listCustomThemes(dataDir);
    assert.ok(themes.includes('retro'));
  });

  it('gets built-in theme CSS', () => {
    const css = getThemeCSS('minimal', templatesDir, dataDir);
    assert.ok(css.includes('sans-serif'));
  });

  it('gets custom theme CSS', () => {
    saveCustomTheme(dataDir, 'retro', 'body { color: green; }');
    const css = getThemeCSS('retro', templatesDir, dataDir);
    assert.ok(css.includes('color: green'));
  });

  it('custom theme overrides built-in of same name', () => {
    saveCustomTheme(dataDir, 'minimal', 'body { color: red; }');
    const css = getThemeCSS('minimal', templatesDir, dataDir);
    assert.ok(css.includes('color: red'));
  });

  it('returns null for unknown theme', () => {
    assert.equal(getThemeCSS('nonexistent', templatesDir, dataDir), null);
  });
});
