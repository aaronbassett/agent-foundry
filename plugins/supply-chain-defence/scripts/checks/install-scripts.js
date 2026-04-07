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

module.exports = async function installScripts(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();
  const packageNames = extractPackageNames(command);

  if (packageNames.length === 0) {
    return { status: "pass", message: "No packages to check", details: {} };
  }

  const flagged = [];

  for (const pkg of packageNames) {
    try {
      const output = execSync(`npm view ${pkg} scripts --json 2>/dev/null`, {
        cwd,
        stdio: "pipe",
        timeout: 10000,
        encoding: "utf8",
      });

      const scripts = JSON.parse(output || "{}");
      const dangerous = ["preinstall", "postinstall", "install", "prepare"];
      const found = dangerous.filter((s) => s in scripts);

      if (found.length > 0) {
        flagged.push({ pkg, scripts: found });
      }
    } catch {
      // Registry lookup failed — skip silently
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
