"use strict";
const { execSync } = require("child_process");

module.exports = async function jqInstalled(input, state, config, cwd) {
  try {
    execSync("jq --version", {
      stdio: "pipe", timeout: 5000, encoding: "utf8",
    });
    return {
      status: "pass",
      message: "jq available",
      details: {},
    };
  } catch {
    return {
      status: "info",
      message: "jq not installed (optional — used by some advanced checks)",
      details: {},
    };
  }
};
