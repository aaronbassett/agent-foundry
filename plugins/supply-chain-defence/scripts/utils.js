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
  // Split into shell segments first, so chained commands, pipes, and
  // redirections are never mistaken for package names. Without this, a command
  // like `pnpm add foo 2>&1 | tail -30` or `cat f | head -30` would treat
  // "tail", "head", "2", etc. as install targets and produce false positives.
  const segments = command.split(/\|\||&&|[;&|\n]/);
  const packages = [];

  for (const rawSegment of segments) {
    // Drop everything from the first redirection operator onward (>, >>, <,
    // 2>&1). The leading \d* consumes a file-descriptor number glued to the
    // operator (e.g. the "2" in "2>&1") so it is not mistaken for a package.
    const segment = rawSegment.split(/\d*[<>]/)[0];
    const parts = segment.trim().split(/\s+/).filter(Boolean);

    let pastCommand = false;
    for (const part of parts) {
      if (!pastCommand) {
        if (/^(install|add|i)$/.test(part)) {
          pastCommand = true;
        }
        continue;
      }

      // Skip flags
      if (part.startsWith("-")) continue;

      // Defence-in-depth: only consider tokens that actually look like a valid
      // npm package name (with optional version). This rejects paths, leftover
      // redirect fds, env assignments, and other shell artifacts.
      if (!isValidPackageName(part)) continue;

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
  }

  return packages;
}

/**
 * Fetch npm registry metadata for a package, used as a second-layer signal to
 * distinguish an established package that merely resembles a popular one from a
 * freshly-published typosquat. Network call — only invoked for flagged suspects.
 *
 * @param {string} name - Package name (a version specifier is stripped).
 * @param {number} [timeoutMs=5000] - Per-request timeout.
 * @returns {Promise<{ok: boolean, downloads: number|null, downloadsAvailable: boolean,
 *   firstPublish: string|null, ageDays: number|null, releases: number|null, error: string|null}>}
 */
async function fetchPackageMetadata(name, timeoutMs = 5000) {
  const meta = {
    ok: false,
    downloads: null,
    downloadsAvailable: false,
    firstPublish: null,
    ageDays: null,
    releases: null,
    error: null,
  };

  // Strip any version specifier down to the bare package name.
  let pkg = name;
  if (pkg.startsWith("@")) {
    const m = pkg.match(/^(@[^@]+\/[^@]+)(?:@.+)?$/);
    if (m) pkg = m[1];
  } else {
    const at = pkg.indexOf("@");
    if (at > 0) pkg = pkg.slice(0, at);
  }
  if (!isValidPackageName(pkg)) {
    meta.error = "invalid-name";
    return meta;
  }

  const encoded = pkg.startsWith("@")
    ? "@" + encodeURIComponent(pkg.slice(1))
    : encodeURIComponent(pkg);

  // Registry packument → first-publish time + release count.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://registry.npmjs.org/${encoded}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      meta.error = "not-found";
      return meta;
    }
    if (!res.ok) {
      meta.error = `registry-http-${res.status}`;
      return meta;
    }
    const data = await res.json();
    if (data.time && data.time.created) {
      meta.firstPublish = data.time.created;
      meta.ageDays = Math.floor(
        (Date.now() - new Date(data.time.created).getTime()) / 86400000
      );
    }
    if (data.versions && typeof data.versions === "object") {
      meta.releases = Object.keys(data.versions).length;
    } else if (data.time) {
      meta.releases = Object.keys(data.time).filter(
        (k) => k !== "created" && k !== "modified"
      ).length;
    }
    meta.ok = true;
  } catch (e) {
    meta.error = e && e.name === "AbortError" ? "timeout" : (e && e.message) || "fetch-failed";
    return meta;
  } finally {
    clearTimeout(timer);
  }

  // Download counts (the npm downloads API does not support scoped packages).
  if (!pkg.startsWith("@")) {
    const dlController = new AbortController();
    const dlTimer = setTimeout(() => dlController.abort(), timeoutMs);
    try {
      const dl = await fetch(
        `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`,
        { signal: dlController.signal }
      );
      if (dl.ok) {
        const dlData = await dl.json();
        if (typeof dlData.downloads === "number") {
          meta.downloads = dlData.downloads;
          meta.downloadsAvailable = true;
        }
      }
    } catch {
      // Downloads are a supplementary signal; ignore failures.
    } finally {
      clearTimeout(dlTimer);
    }
  }

  return meta;
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

/**
 * Layer-1 typosquat detection shared by the command (typosquat-local) and
 * manifest (typosquat-bulk) checks.
 *
 * Compares each name against a list of popular packages using Levenshtein
 * distance, but only within the same namespace class (scoped↔scoped,
 * unscoped↔unscoped) on the FULL name. This is deliberate: comparing only the
 * bare segment caused legitimate scoped packages to be flagged against
 * unrelated unscoped ones (e.g. "@docusaurus/core" → "core" vs "node",
 * "@docusaurus/types" → "types" vs "bytes"). Also flags scope substitution —
 * the same bare name published under a different scope (e.g. @attacker/code-frame
 * vs @babel/code-frame).
 *
 * @param {string[]} names - Candidate package names.
 * @param {string[]} popularPackages - Known-popular package names.
 * @param {number} maxDist - Maximum Levenshtein distance to flag.
 * @returns {{name: string, similarTo: string, distance: number, reason?: string}[]}
 */
function findTyposquatSuspects(names, popularPackages, maxDist) {
  const popularSet = new Set(popularPackages);
  const suspects = [];
  const flagged = new Set();

  // Full-name Levenshtein within the same namespace class.
  for (const name of names) {
    if (popularSet.has(name)) continue;
    const scoped = name.startsWith("@");
    for (const popular of popularPackages) {
      if (popular.startsWith("@") !== scoped) continue;
      const dist = levenshtein(name, popular);
      if (dist > 0 && dist <= maxDist) {
        suspects.push({ name, similarTo: popular, distance: dist });
        flagged.add(name);
        break;
      }
    }
  }

  // Scope substitution. Map each bare segment to the set of popular scopes that
  // use it. A bare name shared by multiple popular scopes (e.g. "core" →
  // @babel + @dataform, "types" → many) is too generic to attribute to one
  // package, so we only flag substitution for bare names distinctive to a
  // single popular scope (e.g. "code-frame" → @babel). This stops legitimate
  // scoped packages such as @docusaurus/core from being flagged.
  const scopesByBare = new Map();
  for (const popular of popularPackages) {
    if (!popular.startsWith("@")) continue;
    const [popScope, popBare] = popular.slice(1).split("/");
    if (!popBare) continue;
    if (!scopesByBare.has(popBare)) scopesByBare.set(popBare, new Set());
    scopesByBare.get(popBare).add(popScope);
  }

  for (const name of names) {
    if (!name.startsWith("@")) continue;
    if (popularSet.has(name)) continue;
    if (flagged.has(name)) continue;
    const [scope, bare] = name.slice(1).split("/");
    if (!bare) continue;

    const scopes = scopesByBare.get(bare);
    if (!scopes || scopes.size !== 1) continue; // generic or unknown → not flagged
    if (scopes.has(scope)) continue; // uses the legitimate scope

    const legitScope = [...scopes][0];
    suspects.push({
      name,
      similarTo: `@${legitScope}/${bare}`,
      distance: 0,
      reason: "scope substitution — same package name under a different scope",
    });
    flagged.add(name);
  }

  return suspects;
}

module.exports = {
  npmView,
  extractPackageNames,
  isValidPackageName,
  levenshtein,
  fetchPackageMetadata,
  findTyposquatSuspects,
};
