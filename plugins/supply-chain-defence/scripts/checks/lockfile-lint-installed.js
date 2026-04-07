"use strict";
const { execSync } = require("child_process");

module.exports = async function lockfileLintInstalled(input, state, config, cwd) {
  try {
    const version = execSync("npx lockfile-lint --version", {
      stdio: "pipe", timeout: 10000, encoding: "utf8",
    }).trim();
    return {
      status: "pass",
      message: `lockfile-lint ${version}`,
      details: { version },
    };
  } catch {
    return {
      status: "warn",
      message: "lockfile-lint not installed. Install: npm install -g lockfile-lint",
      details: {},
    };
  }
};
