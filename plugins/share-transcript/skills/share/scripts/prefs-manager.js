/**
 * prefs-manager.js — Persistent preferences storage for share-transcript.
 *
 * Storage layout under dataDir:
 *   dataDir/
 *   ├── presets/
 *   │   ├── last-used.json
 *   │   └── named/
 *   │       ├── team-share.json
 *   │       └── blog-post.json
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── Helpers ───────────────────────────────────────────────────────────────────

function presetsDir(dataDir) {
  return join(dataDir, 'presets');
}

function namedDir(dataDir) {
  return join(dataDir, 'presets', 'named');
}

function lastUsedPath(dataDir) {
  return join(dataDir, 'presets', 'last-used.json');
}

function namedPath(dataDir, name) {
  return join(dataDir, 'presets', 'named', `${name}.json`);
}

function readJSON(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Last-used ─────────────────────────────────────────────────────────────────

/**
 * Read last-used preferences from dataDir.
 *
 * @param {string} dataDir
 * @returns {object|null}
 */
export function getLastUsed(dataDir) {
  return readJSON(lastUsedPath(dataDir));
}

/**
 * Write last-used preferences to dataDir, creating dirs as needed.
 *
 * @param {string} dataDir
 * @param {object} prefs
 */
export function saveLastUsed(dataDir, prefs) {
  mkdirSync(presetsDir(dataDir), { recursive: true });
  writeJSON(lastUsedPath(dataDir), prefs);
}

// ── Named presets ─────────────────────────────────────────────────────────────

/**
 * Read a named preset from dataDir.
 *
 * @param {string} dataDir
 * @param {string} name
 * @returns {object|null}
 */
export function getPreset(dataDir, name) {
  return readJSON(namedPath(dataDir, name));
}

/**
 * Save a named preset to dataDir.
 * Preserves createdAt if the preset already exists; sets updatedAt on update.
 * Always sets the name field.
 *
 * @param {string} dataDir
 * @param {string} name
 * @param {object} config
 */
export function savePreset(dataDir, name, config) {
  mkdirSync(namedDir(dataDir), { recursive: true });

  const existing = readJSON(namedPath(dataDir, name));
  const now = new Date().toISOString();

  const record = {
    ...config,
    name,
    createdAt: existing ? existing.createdAt : now,
  };

  if (existing) {
    record.updatedAt = now;
  }

  writeJSON(namedPath(dataDir, name), record);
}

/**
 * List all named presets in dataDir.
 *
 * @param {string} dataDir
 * @returns {object[]}
 */
export function listPresets(dataDir) {
  const dir = namedDir(dataDir);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJSON(join(dir, f)))
    .filter(Boolean);
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('prefs-manager.js')) {
  const args = process.argv.slice(2);
  const subcommand = args[0];

  const getFlag = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const dataDir = getFlag('--data-dir');
  const name = getFlag('--name');
  const configRaw = getFlag('--config');

  if (!dataDir) {
    process.stderr.write('Error: --data-dir is required\n');
    process.exit(1);
  }

  switch (subcommand) {
    case 'get-last': {
      const result = getLastUsed(dataDir);
      process.stdout.write(JSON.stringify(result) + '\n');
      break;
    }
    case 'save-last': {
      const prefs = JSON.parse(configRaw);
      saveLastUsed(dataDir, prefs);
      process.stdout.write(JSON.stringify({ ok: true }) + '\n');
      break;
    }
    case 'get-preset': {
      if (!name) { process.stderr.write('Error: --name is required\n'); process.exit(1); }
      const result = getPreset(dataDir, name);
      process.stdout.write(JSON.stringify(result) + '\n');
      break;
    }
    case 'save-preset': {
      if (!name) { process.stderr.write('Error: --name is required\n'); process.exit(1); }
      const config = JSON.parse(configRaw);
      savePreset(dataDir, name, config);
      process.stdout.write(JSON.stringify({ ok: true }) + '\n');
      break;
    }
    case 'list-presets': {
      const list = listPresets(dataDir);
      process.stdout.write(JSON.stringify(list) + '\n');
      break;
    }
    default: {
      process.stderr.write(`Unknown subcommand: ${subcommand}\n`);
      process.stderr.write('Usage: prefs-manager.js <get-last|save-last|get-preset|save-preset|list-presets> --data-dir <dir> [--name <name>] [--config <json>]\n');
      process.exit(1);
    }
  }
}
