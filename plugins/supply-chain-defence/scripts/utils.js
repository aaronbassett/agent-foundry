"use strict";

const { spawnSync } = require("child_process");

/**
 * Validate that a string looks like a valid npm package name.
 * Rejects path traversal, shell metacharacters, and other invalid input.
 * Allows version specifiers (e.g., lodash@4.17.21, @babel/core@^7.0.0).
 */
function isValidPackageName(name) {
  // Strip version specifier for validation
  let bare = name;
  if (name.startsWith("@")) {
    // Scoped: @scope/pkg or @scope/pkg@version
    const match = name.match(/^(@[^@]+\/[^@]+)(?:@.+)?$/);
    bare = match ? match[1] : name;
  } else {
    const atIdx = name.indexOf("@");
    if (atIdx > 0) bare = name.slice(0, atIdx);
  }

  // npm package names: lowercase, alphanumeric, hyphens, dots, underscores, tildes
  // Scoped: @scope/name where scope and name follow the same rules
  return /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/.test(bare);
}

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
  // Defence-in-depth: reject obviously invalid package names
  if (!pkg || !isValidPackageName(pkg)) {
    return { ok: false, data: null, error: `Invalid package name: ${pkg}` };
  }
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

/**
 * Levenshtein edit distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

module.exports = { npmView, extractPackageNames, isValidPackageName, levenshtein };
