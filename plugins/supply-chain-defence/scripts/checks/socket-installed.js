"use strict";
const { spawnSync } = require("child_process");

module.exports = async function socketInstalled(input, state, config, cwd) {
  const result = spawnSync("socket", ["--version"], {
    stdio: "pipe", timeout: 5000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "warn",
      message: "Socket.dev CLI not installed. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }
  return {
    status: "pass",
    message: `Socket.dev CLI ${result.stdout.trim()}`,
    details: { version: result.stdout.trim() },
  };
};
