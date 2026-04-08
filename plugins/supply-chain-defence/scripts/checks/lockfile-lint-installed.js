"use strict";
const { spawnSync } = require("child_process");

module.exports = async function lockfileLintInstalled(input, state, config, cwd) {
  const result = spawnSync("npx", ["lockfile-lint", "--version"], {
    stdio: "pipe", timeout: 10000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "warn",
      message: "lockfile-lint not installed. Install: npm install -g lockfile-lint",
      details: {},
    };
  }
  return {
    status: "pass",
    message: `lockfile-lint ${result.stdout.trim()}`,
    details: { version: result.stdout.trim() },
  };
};
