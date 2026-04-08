"use strict";

const { npmView, extractPackageNames } = require("../utils");

module.exports = async function maintainerHistory(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packages = extractPackageNames(command);

  if (packages.length === 0) {
    return { status: "info", message: "No package names to check", details: {} };
  }

  const flagged = [];

  for (const pkg of packages) {
    const result = npmView(pkg.full, ["--json"], cwd, 15000);
    if (!result.ok) continue;

    const meta = result.data;
    const maintainers = meta.maintainers || [];

    if (maintainers.length <= 1) {
      flagged.push({
        pkg: pkg.name,
        maintainerCount: maintainers.length,
        maintainers: maintainers.map((m) =>
          typeof m === "string" ? m : m.name || m.email || "unknown"
        ),
      });
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
      "Single-maintainer packages are higher risk for account takeover."
  );

  return {
    status: "warn",
    message: "Single-maintainer packages detected:\n" + lines.join("\n"),
    details: { flagged },
  };
};
