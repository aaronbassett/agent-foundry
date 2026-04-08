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

module.exports = async function registryMetadata(input, state, config, cwd) {
  const command = input.tool_input?.command || "";
  const packageNames = extractPackageNames(command);

  if (packageNames.length === 0) {
    return { status: "info", message: "No package names to check", details: {} };
  }

  const results = [];

  for (const pkg of packageNames) {
    try {
      const output = execSync(`npm view ${pkg} --json 2>/dev/null`, {
        cwd,
        stdio: "pipe",
        timeout: 15000,
        encoding: "utf8",
      });

      const meta = JSON.parse(output);
      const versions = meta.versions || [];
      const maintainers = meta.maintainers || [];
      const license = meta.license || "unknown";
      const latestVersion = meta.version || meta["dist-tags"]?.latest || "unknown";

      // Check publish date of latest version
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

      results.push({
        pkg,
        version: latestVersion,
        versions: versions.length,
        maintainers: maintainers.length,
        license,
        ageMessage,
        concerns: [],
      });

      // Flag concerns
      if (maintainers.length <= 1) {
        results[results.length - 1].concerns.push(
          `Single maintainer — higher risk of account takeover`
        );
      }
      if (versions.length <= 1) {
        results[results.length - 1].concerns.push(
          `Only 1 published version — very new package`
        );
      }
    } catch {
      results.push({
        pkg,
        version: "unknown",
        versions: 0,
        maintainers: 0,
        license: "unknown",
        ageMessage: "",
        concerns: ["Could not fetch registry metadata"],
      });
    }
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
