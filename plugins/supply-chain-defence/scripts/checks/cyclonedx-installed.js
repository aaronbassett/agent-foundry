"use strict";
const { spawnSync } = require("child_process");

module.exports = async function cyclonedxInstalled(input, state, config, cwd) {
  const result = spawnSync("npx", ["@cyclonedx/cyclonedx-npm", "--version"], {
    stdio: "pipe", timeout: 10000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "info",
      message: "CycloneDX npm not installed (optional — for SBOM generation)",
      details: {},
    };
  }
  return {
    status: "pass",
    message: "CycloneDX npm (SBOM generation) available",
    details: {},
  };
};
