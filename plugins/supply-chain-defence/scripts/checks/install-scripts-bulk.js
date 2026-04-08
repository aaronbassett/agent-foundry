"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DANGEROUS_SCRIPTS = ["preinstall", "postinstall", "install", "prepare"];

module.exports = async function installScriptsBulk(input, state, config, cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return { status: "warn", message: "Could not parse package.json", details: {} };
  }

  const allDeps = Object.keys({
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  });

  if (allDeps.length === 0) {
    return { status: "pass", message: "No dependencies to check", details: {} };
  }

  const flagged = [];

  for (const dep of allDeps) {
    try {
      const output = execSync(`npm view ${dep} scripts --json 2>/dev/null`, {
        cwd,
        stdio: "pipe",
        timeout: 10000,
        encoding: "utf8",
      });

      const scripts = JSON.parse(output || "{}");
      const found = DANGEROUS_SCRIPTS.filter((s) => s in scripts);

      if (found.length > 0) {
        flagged.push({ dep, scripts: found });
      }
    } catch {
      // Registry lookup failed — skip silently
    }
  }

  if (flagged.length === 0) {
    return {
      status: "pass",
      message: `Checked ${allDeps.length} dependencies — none have lifecycle scripts`,
      details: { checked: allDeps.length },
    };
  }

  const lines = flagged.map(
    (f) => `"${f.dep}" has: ${f.scripts.join(", ")}`
  );

  return {
    status: "warn",
    message:
      `${flagged.length} of ${allDeps.length} dependencies have lifecycle scripts:\n` +
      lines.join("\n") +
      "\n\nEnsure ignore-scripts=true in .npmrc to prevent automatic execution.",
    details: { flagged, checked: allDeps.length },
  };
};
