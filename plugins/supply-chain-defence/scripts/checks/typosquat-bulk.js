"use strict";

const fs = require("fs");
const path = require("path");
const { findTyposquatSuspects } = require("../utils");

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

  const maxDist = config.thresholds.typosquatMaxDistance || 2;
  // Full-name, same-namespace-class comparison (see utils.findTyposquatSuspects):
  // a legitimate scoped package like @docusaurus/core is no longer compared by
  // its bare segment ("core") against unrelated unscoped packages.
  const suspects = findTyposquatSuspects(allDeps, popularPackages, maxDist);

  if (suspects.length === 0) {
    return {
      status: "pass",
      message: `Checked ${allDeps.length} dependencies — no typosquatting suspects`,
      details: { checked: allDeps.length },
    };
  }

  const lines = suspects.map((s) =>
    s.reason
      ? `"${s.name}" looks like "${s.similarTo}" (${s.reason})`
      : `"${s.name}" looks like "${s.similarTo}" (edit distance: ${s.distance})`
  );

  return {
    status: "warn",
    message:
      "Possible typosquatting in existing dependencies:\n" +
      lines.join("\n") +
      "\n\nReview these packages carefully. Inspect each with `npm view <pkg> " +
      "homepage repository maintainers`, or check it at https://socket.dev/npm/package/<pkg>.",
    details: { suspects, checked: allDeps.length },
  };
};
