"use strict";

const { npmView, extractPackageNames } = require("../utils");

const DANGEROUS_SCRIPTS = ["preinstall", "postinstall", "install", "prepare"];

module.exports = async function installScripts(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();
  const packages = extractPackageNames(command);

  if (packages.length === 0) {
    return { status: "pass", message: "No packages to check", details: {} };
  }

  const flagged = [];

  for (const pkg of packages) {
    const result = npmView(pkg.full, ["scripts", "--json"], cwd, 10000);
    if (!result.ok) continue;

    const scripts = result.data || {};
    const found = DANGEROUS_SCRIPTS.filter((s) => s in scripts);

    if (found.length > 0) {
      flagged.push({ pkg: pkg.name, scripts: found });
    }
  }

  if (flagged.length === 0) {
    return {
      status: "pass",
      message: "No lifecycle scripts detected in target packages",
      details: {},
    };
  }

  const lines = flagged.map(
    (f) => `"${f.pkg}" has lifecycle scripts: ${f.scripts.join(", ")}`
  );

  return {
    status: "block",
    message:
      "Packages with lifecycle scripts detected:\n" +
      lines.join("\n") +
      "\n\nLifecycle scripts (preinstall, postinstall) are the primary malware execution vector in npm supply chain attacks. " +
      "Ensure ignore-scripts=true in .npmrc and review these scripts before allowing execution.",
    details: { key: flagged[0].pkg, flagged },
  };
};
