"use strict";

const { execSync } = require("child_process");

module.exports = async function npxAudit(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();

  // Extract the package name from the npx command
  // npx <package> [args] or npx -y <package> [args] or npx --yes <package> [args]
  const parts = command.split(/\s+/);
  let pkgName = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    // Skip flags
    if (part === "-y" || part === "--yes" || part === "-p" || part === "--package") continue;
    if (part.startsWith("-")) continue;
    // First non-flag argument is the package
    pkgName = part.split("@")[0] || part;
    // Handle scoped packages
    if (part.startsWith("@") && parts[i + 1] && !parts[i + 1].startsWith("-")) {
      pkgName = part;
    }
    break;
  }

  if (!pkgName) {
    return { status: "pass", message: "Could not extract package name from npx command", details: {} };
  }

  // Check registry for basic metadata
  try {
    const output = execSync(`npm view ${pkgName} --json 2>/dev/null`, {
      cwd,
      stdio: "pipe",
      timeout: 15000,
      encoding: "utf8",
    });

    const meta = JSON.parse(output);
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
          `npx executed ${pkgName}@${version}. Concerns: ${concerns.join("; ")}. ` +
          "npx auto-installs packages, bypassing install guards.",
        details: { pkg: pkgName, version, concerns },
      };
    }

    return {
      status: "pass",
      message: `npx executed ${pkgName}@${version} — no concerns`,
      details: { pkg: pkgName, version },
    };
  } catch {
    return {
      status: "info",
      message: `npx executed ${pkgName} — could not verify registry metadata`,
      details: { pkg: pkgName },
    };
  }
};
