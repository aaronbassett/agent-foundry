"use strict";

const fs = require("fs");
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

module.exports = async function typosquatBulk(input, state, config, cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return {
      status: "warn",
      message: "Could not parse package.json",
      details: {},
    };
  }

  const allDeps = Object.keys({
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.peerDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  });

  if (allDeps.length === 0) {
    return { status: "pass", message: "No dependencies to check", details: {} };
  }

  const dataPath = path.join(__dirname, "..", "data", "popular-packages.json");
  let popularPackages;
  try {
    popularPackages = require(dataPath);
  } catch {
    return {
      status: "info",
      message: "Could not load popular packages list",
      details: {},
    };
  }

  const popularSet = new Set(popularPackages);
  const maxDist = config.thresholds.typosquatMaxDistance || 2;
  const suspects = [];

  for (const dep of allDeps) {
    if (popularSet.has(dep)) continue;

    const bare = dep.startsWith("@") ? dep.split("/")[1] || dep : dep;

    for (const popular of popularPackages) {
      const popularBare = popular.startsWith("@")
        ? popular.split("/")[1] || popular
        : popular;
      const dist = levenshtein(bare, popularBare);
      if (dist > 0 && dist <= maxDist) {
        suspects.push({ dep, similarTo: popular, distance: dist });
        break;
      }
    }
  }

  // Scope-substitution check — always runs, not conditional on suspects being empty
  const alreadyFlagged = new Set(suspects.map((s) => s.dep));
  for (const dep of allDeps) {
    if (!dep.startsWith("@")) continue;
    if (popularSet.has(dep)) continue;
    if (alreadyFlagged.has(dep)) continue;

    const [depScope, depBare] = dep.slice(1).split("/");
    if (!depBare) continue;

    for (const popular of popularPackages) {
      if (!popular.startsWith("@")) continue;
      const [popScope, popBare] = popular.slice(1).split("/");
      if (depBare === popBare && depScope !== popScope) {
        suspects.push({
          dep,
          similarTo: popular,
          distance: 0,
          reason: "scope substitution — same package name under a different scope",
        });
        break;
      }
    }
  }

  if (suspects.length === 0) {
    return {
      status: "pass",
      message: `Checked ${allDeps.length} dependencies — no typosquatting suspects`,
      details: { checked: allDeps.length },
    };
  }

  const lines = suspects.map(
    (s) =>
      s.reason
        ? `"${s.dep}" looks like "${s.similarTo}" (${s.reason})`
        : `"${s.dep}" looks like "${s.similarTo}" (edit distance: ${s.distance})`
  );

  return {
    status: "warn",
    message:
      "Possible typosquatting in existing dependencies:\n" +
      lines.join("\n") +
      "\n\nReview these packages carefully.",
    details: { suspects, checked: allDeps.length },
  };
};
