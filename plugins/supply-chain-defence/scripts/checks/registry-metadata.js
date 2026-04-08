"use strict";

const { npmView, extractPackageNames } = require("../utils");

module.exports = async function registryMetadata(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packages = extractPackageNames(command);

  if (packages.length === 0) {
    return { status: "info", message: "No package names to check", details: {} };
  }

  const results = [];

  for (const pkg of packages) {
    const result = npmView(pkg.full, ["--json"], cwd, 15000);

    if (!result.ok) {
      results.push({
        pkg: pkg.name,
        version: "unknown",
        versions: 0,
        maintainers: 0,
        license: "unknown",
        ageMessage: "",
        concerns: ["Could not fetch registry metadata"],
      });
      continue;
    }

    const meta = result.data;
    const versions = meta.versions || [];
    const maintainers = meta.maintainers || [];
    const license = meta.license || "unknown";
    const latestVersion = meta.version || "unknown";

    const time = meta.time || {};
    const latestTime = time[latestVersion];
    let ageMessage = "";
    if (latestTime) {
      const ageDays = Math.floor(
        (Date.now() - new Date(latestTime).getTime()) / (24 * 3600 * 1000)
      );
      ageMessage = `published ${ageDays} days ago`;
      if (ageDays < (config.thresholds.beforeFlagDays || 5)) {
        ageMessage += " (RECENT — within minimum release age window)";
      }
    }

    const entry = {
      pkg: pkg.name,
      version: latestVersion,
      versions: versions.length,
      maintainers: maintainers.length,
      license,
      ageMessage,
      concerns: [],
    };

    if (maintainers.length <= 1) {
      entry.concerns.push("Single maintainer — higher risk of account takeover");
    }
    if (versions.length <= 1) {
      entry.concerns.push("Only 1 published version — very new package");
    }

    results.push(entry);
  }

  const hasConcerns = results.some((r) => r.concerns.length > 0);
  const lines = results.map((r) => {
    let line = `${r.pkg}@${r.version}: ${r.versions} versions, ${r.maintainers} maintainers, license: ${r.license}`;
    if (r.ageMessage) line += `, ${r.ageMessage}`;
    if (r.concerns.length > 0) line += `\n  Concerns: ${r.concerns.join("; ")}`;
    return line;
  });

  return {
    status: hasConcerns ? "warn" : "pass",
    message: "Registry metadata:\n" + lines.join("\n"),
    details: { results },
  };
};
