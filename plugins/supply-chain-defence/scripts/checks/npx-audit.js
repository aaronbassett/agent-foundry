"use strict";

const { npmView } = require("../utils");

function extractNpxPackage(command) {
  const parts = command.split(/\s+/);

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part === "-y" || part === "--yes" || part === "-p" || part === "--package") continue;
    if (part.startsWith("-")) continue;

    // Parse scoped and unscoped packages
    if (part.startsWith("@")) {
      const match = part.match(/^(@[^@]+\/[^@]+)(?:@(.+))?$/);
      if (match) {
        return { name: match[1], full: match[2] ? `${match[1]}@${match[2]}` : match[1] };
      }
      return { name: part, full: part };
    }

    const atIdx = part.indexOf("@");
    if (atIdx > 0) {
      return { name: part.slice(0, atIdx), full: part };
    }
    return { name: part, full: part };
  }

  return null;
}

module.exports = async function npxAudit(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();
  const pkg = extractNpxPackage(command);

  if (!pkg) {
    return { status: "pass", message: "Could not extract package name from npx command", details: {} };
  }

  const result = npmView(pkg.full, ["--json"], cwd, 15000);

  if (!result.ok) {
    return {
      status: "info",
      message: `npx executed ${pkg.name} — could not verify registry metadata`,
      details: { pkg: pkg.name },
    };
  }

  const meta = result.data;
  const maintainers = meta.maintainers || [];
  const version = meta.version || "unknown";
  const scripts = meta.scripts || {};
  const dangerous = ["preinstall", "postinstall", "install"].filter((s) => s in scripts);

  const concerns = [];

  if (maintainers.length <= 1) {
    concerns.push("single maintainer");
  }
  if (dangerous.length > 0) {
    concerns.push(`lifecycle scripts: ${dangerous.join(", ")}`);
  }

  if (concerns.length > 0) {
    return {
      status: "warn",
      message:
        `npx executed ${pkg.name}@${version}. Concerns: ${concerns.join("; ")}. ` +
        "npx auto-installs packages, bypassing install guards.",
      details: { pkg: pkg.name, version, concerns },
    };
  }

  return {
    status: "pass",
    message: `npx executed ${pkg.name}@${version} — no concerns`,
    details: { pkg: pkg.name, version },
  };
};

// Export for testing
if (require.main !== module) {
  module.exports.extractNpxPackage = extractNpxPackage;
}
