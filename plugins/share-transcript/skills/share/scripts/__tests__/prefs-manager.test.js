import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  getLastUsed, saveLastUsed,
  getPreset, savePreset, listPresets
} = await import(join(__dirname, '..', 'prefs-manager.js'));

let dataDir;

beforeEach(() => {
  dataDir = join(tmpdir(), `prefs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
});

describe('prefs-manager', () => {
  describe('last-used', () => {
    it('returns null when no last-used exists', () => {
      assert.equal(getLastUsed(dataDir), null);
    });

    it('saves and retrieves last-used preferences', () => {
      const prefs = {
        format: 'html', theme: 'minimal',
        redaction: { preset: 'medium', overrides: {} },
        subagentHandling: 'include',
        fromPreset: null
      };
      saveLastUsed(dataDir, prefs);
      const result = getLastUsed(dataDir);
      assert.equal(result.format, 'html');
      assert.equal(result.theme, 'minimal');
    });

    it('tracks which named preset was used', () => {
      const prefs = {
        format: 'html', theme: 'chat-bubbles',
        redaction: { preset: 'light', overrides: {} },
        subagentHandling: 'exclude',
        fromPreset: 'team-share'
      };
      saveLastUsed(dataDir, prefs);
      const result = getLastUsed(dataDir);
      assert.equal(result.fromPreset, 'team-share');
    });
  });

  describe('named presets', () => {
    it('returns null for nonexistent preset', () => {
      assert.equal(getPreset(dataDir, 'nope'), null);
    });

    it('saves and retrieves a named preset', () => {
      const preset = {
        format: 'markdown', theme: null,
        redaction: { preset: 'heavy', overrides: { codeBlocks: false } },
        subagentHandling: 'separate'
      };
      savePreset(dataDir, 'blog-post', preset);
      const result = getPreset(dataDir, 'blog-post');
      assert.equal(result.name, 'blog-post');
      assert.equal(result.format, 'markdown');
      assert.ok(result.createdAt);
    });

    it('updates an existing preset', () => {
      savePreset(dataDir, 'team', { format: 'html', theme: 'minimal', redaction: { preset: 'light', overrides: {} }, subagentHandling: 'include' });
      savePreset(dataDir, 'team', { format: 'html', theme: 'chat-bubbles', redaction: { preset: 'medium', overrides: {} }, subagentHandling: 'include' });
      const result = getPreset(dataDir, 'team');
      assert.equal(result.theme, 'chat-bubbles');
      assert.ok(result.updatedAt);
    });

    it('lists all named presets', () => {
      savePreset(dataDir, 'preset-a', { format: 'html', theme: 'minimal', redaction: { preset: 'none', overrides: {} }, subagentHandling: 'include' });
      savePreset(dataDir, 'preset-b', { format: 'markdown', theme: null, redaction: { preset: 'light', overrides: {} }, subagentHandling: 'exclude' });
      const list = listPresets(dataDir);
      assert.equal(list.length, 2);
      assert.ok(list.some(p => p.name === 'preset-a'));
      assert.ok(list.some(p => p.name === 'preset-b'));
    });

    it('returns empty array when no presets exist', () => {
      assert.deepEqual(listPresets(dataDir), []);
    });
  });
});
