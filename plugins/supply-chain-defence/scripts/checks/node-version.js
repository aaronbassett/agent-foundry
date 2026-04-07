"use strict";
const { execSync } = require("child_process");

module.exports = async function nodeVersion(input, state, config, cwd) {
  try {
    const version = execSync("node --version", {
      stdio: "pipe", timeout: 5000, encoding: "utf8",
    }).trim();
    const major = parseInt(version.replace("v", "").split(".")[0], 10);
    if (major < 18) {
      return {
        status: "warn",
        message: `Node.js ${version} detected — version 18+ recommended`,
        details: { version },
      };
    }
    return {
      status: "pass",
      message: `Node.js ${version}`,
      details: { version },
    };
  } catch {
    return {
      status: "warn",
      message: "Node.js not found",
      details: {},
    };
  }
};
