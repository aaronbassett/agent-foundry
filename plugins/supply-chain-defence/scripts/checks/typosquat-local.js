"use strict";

const path = require("path");

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

function extractPackageNames(command) {
  const parts = command.split(/\s+/);
  const packages = [];
  let pastCommand = false;

  for (const part of parts) {
    if (!pastCommand) {
      if (
        part === "install" ||
        part === "add" ||
        part === "i"
      ) {
        pastCommand = true;
      }
      continue;
    }
    if (part.startsWith("-")) continue;
    const name = part.split("@")[0] || part;
    if (name) packages.push(part.includes("@") && part.startsWith("@") ? part.split("@").slice(0, 2).join("@") : name);
  }

  return packages;
}

module.exports = async function typosquatLocal(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packageNames = extractPackageNames(command);

  if (packageNames.length === 0) {
    return { status: "pass", message: "No package names to check", details: {} };
  }

  const dataPath = path.join(__dirname, "..", "data", "popular-packages.json");
  let popularPackages;
  try {
    popularPackages = require(dataPath);
  } catch {
    return {
      status: "info",
      message: "Could not load popular packages list for typosquat check",
      details: {},
    };
  }

  const maxDist = config.thresholds.typosquatMaxDistance || 2;
  const suspects = [];

  for (const pkg of packageNames) {
    if (popularPackages.includes(pkg)) continue;

    const bare = pkg.startsWith("@") ? pkg.split("/")[1] || pkg : pkg;

    for (const popular of popularPackages) {
      const popularBare = popular.startsWith("@")
        ? popular.split("/")[1] || popular
        : popular;
      const dist = levenshtein(bare, popularBare);
      if (dist > 0 && dist <= maxDist) {
        suspects.push({ pkg, similarTo: popular, distance: dist });
        break;
      }
    }
  }

  // Scope-substitution check: same bare name as a popular scoped package, different scope
  if (suspects.length === 0) {
    for (const pkg of packageNames) {
      if (!pkg.startsWith("@")) continue;
      if (popularPackages.includes(pkg)) continue;

      const [pkgScope, pkgBare] = pkg.slice(1).split("/");
      if (!pkgBare) continue;

      for (const popular of popularPackages) {
        if (!popular.startsWith("@")) continue;
        const [popScope, popBare] = popular.slice(1).split("/");
        if (pkgBare === popBare && pkgScope !== popScope) {
          suspects.push({
            pkg,
            similarTo: popular,
            distance: 0,
            reason: "scope substitution — same package name under a different scope",
          });
          break;
        }
      }
    }
  }

  if (suspects.length === 0) {
    return {
      status: "pass",
      message: "No typosquatting suspects found",
      details: {},
    };
  }

  const lines = suspects.map(
    (s) =>
      s.reason
        ? `"${s.pkg}" looks like "${s.similarTo}" (${s.reason})`
        : `"${s.pkg}" is suspiciously similar to "${s.similarTo}" (edit distance: ${s.distance})`
  );

  return {
    status: "block",
    message:
      "Possible typosquatting detected:\n" +
      lines.join("\n") +
      "\n\nVerify these are the correct package names before proceeding.",
    details: { key: suspects[0].pkg, suspects },
  };
};
