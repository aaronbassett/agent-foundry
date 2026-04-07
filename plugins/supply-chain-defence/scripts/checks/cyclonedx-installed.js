"use strict";
const { execSync } = require("child_process");

module.exports = async function cyclonedxInstalled(input, state, config, cwd) {
  try {
    execSync("npx @cyclonedx/cyclonedx-npm --version", {
      stdio: "pipe", timeout: 10000, encoding: "utf8",
    });
    return {
      status: "pass",
      message: "CycloneDX npm (SBOM generation) available",
      details: {},
    };
  } catch {
    return {
      status: "info",
      message: "CycloneDX npm not installed (optional — for SBOM generation)",
      details: {},
    };
  }
};
