"use strict";
const { spawnSync } = require("child_process");

module.exports = async function nodeVersion(input, state, config, cwd) {
  const result = spawnSync("node", ["--version"], {
    stdio: "pipe", timeout: 5000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "warn",
      message: "Node.js not found",
      details: {},
    };
  }
  const version = result.stdout.trim();
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
};
