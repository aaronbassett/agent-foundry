"use strict";
const { execSync } = require("child_process");

module.exports = async function socketInstalled(input, state, config, cwd) {
  try {
    const version = execSync("socket --version", {
      stdio: "pipe", timeout: 5000, encoding: "utf8",
    }).trim();
    return {
      status: "pass",
      message: `Socket.dev CLI ${version}`,
      details: { version },
    };
  } catch {
    return {
      status: "warn",
      message: "Socket.dev CLI not installed. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }
};
