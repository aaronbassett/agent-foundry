"use strict";

const { execSync } = require("child_process");

function extractPackageNames(command) {
  const parts = command.split(/\s+/);
  const packages = [];
  let pastCommand = false;

  for (const part of parts) {
    if (!pastCommand) {
      if (part === "install" || part === "add" || part === "i") {
        pastCommand = true;
      }
      continue;
    }
    if (part.startsWith("-")) continue;
    const name = part.replace(/@[\d^~>=<.*]+$/, "");
    if (name) packages.push(name);
  }
  return packages;
}

module.exports = async function maintainerHistory(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packageNames = extractPackageNames(command);

  if (packageNames.length === 0) {
    return { status: "info", message: "No package names to check", details: {} };
  }

  const flagged = [];

  for (const pkg of packageNames) {
    try {
      const output = execSync(`npm view ${pkg} --json 2>/dev/null`, {
        cwd,
        stdio: "pipe",
        timeout: 15000,
        encoding: "utf8",
      });

      const meta = JSON.parse(output);
      const maintainers = meta.maintainers || [];

      if (maintainers.length <= 1) {
        flagged.push({
          pkg,
          maintainerCount: maintainers.length,
          maintainers: maintainers.map((m) =>
            typeof m === "string" ? m : m.name || m.email || "unknown"
          ),
        });
      }
    } catch {
      // Skip packages we can't query
    }
  }

  if (flagged.length === 0) {
    return {
      status: "pass",
      message: "All checked packages have multiple maintainers",
      details: {},
    };
  }

  const lines = flagged.map(
    (f) =>
      `"${f.pkg}" has ${f.maintainerCount} maintainer(s): ${f.maintainers.join(", ")}. ` +
      "Single-maintainer packages are higher risk — account takeover compromises all releases (e.g., Axios March 2026)."
  );

  return {
    status: "warn",
    message: "Single-maintainer packages detected:\n" + lines.join("\n"),
    details: { flagged },
  };
};
