"use strict";

const { spawnSync } = require("child_process");

/**
 * Safely query npm view for a package, avoiding shell injection.
 * Uses spawnSync with array args — never invokes a shell.
 *
 * @param {string} pkg - Package name (may include version specifier)
 * @param {string[]} fields - Fields to query (e.g., ["scripts", "--json"])
 * @param {string} cwd - Working directory
 * @param {number} [timeout=15000] - Timeout in ms
 * @returns {{ ok: boolean, data: any, error?: string }}
 */
function npmView(pkg, fields, cwd, timeout = 15000) {
  const args = ["view", pkg, ...fields];
  const result = spawnSync("npm", args, {
    cwd,
    stdio: "pipe",
    timeout,
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout) {
    return {
      ok: false,
      data: null,
      error: result.stderr?.trim() || "npm view failed",
    };
  }

  try {
    return { ok: true, data: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, data: null, error: "Failed to parse npm view output" };
  }
}

/**
 * Extract package names (with optional version specifiers) from an install/add command.
 * Handles scoped packages (@scope/pkg), version specifiers (@1.2.3), and flags.
 *
 * @param {string} command - The full shell command string
 * @returns {{ name: string, full: string }[]} - Array of { name (bare), full (with version) }
 */
function extractPackageNames(command) {
  const parts = command.split(/\s+/);
  const packages = [];
  let pastCommand = false;

  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];

    if (!pastCommand) {
      if (/^(install|add|i)$/.test(part)) {
        pastCommand = true;
      }
      continue;
    }

    // Skip flags
    if (part.startsWith("-")) continue;

    // Parse scoped and unscoped packages with optional version
    let name, full;
    if (part.startsWith("@")) {
      // Scoped: @scope/pkg or @scope/pkg@version
      const match = part.match(/^(@[^@]+\/[^@]+)(?:@(.+))?$/);
      if (match) {
        name = match[1];
        full = match[2] ? `${match[1]}@${match[2]}` : match[1];
      } else {
        name = part;
        full = part;
      }
    } else {
      // Unscoped: pkg or pkg@version
      const atIdx = part.indexOf("@");
      if (atIdx > 0) {
        name = part.slice(0, atIdx);
        full = part;
      } else {
        name = part;
        full = part;
      }
    }

    if (name) {
      packages.push({ name, full });
    }
  }

  return packages;
}

module.exports = { npmView, extractPackageNames };
