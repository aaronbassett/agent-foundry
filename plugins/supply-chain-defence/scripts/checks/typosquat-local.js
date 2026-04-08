"use strict";

const path = require("path");
const { extractPackageNames, levenshtein } = require("../utils");

module.exports = async function typosquatLocal(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packages = extractPackageNames(command);
  const packageNames = packages.map((p) => p.name);

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
  const alreadyFlagged = new Set();

  // Levenshtein distance check
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
        alreadyFlagged.add(pkg);
        break;
      }
    }
  }

  // Scope-substitution check — always runs, not conditional on suspects being empty
  for (const pkg of packageNames) {
    if (!pkg.startsWith("@")) continue;
    if (popularPackages.includes(pkg)) continue;
    if (alreadyFlagged.has(pkg)) continue;

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
