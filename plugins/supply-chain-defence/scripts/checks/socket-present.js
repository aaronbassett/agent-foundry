"use strict";

const { execSync } = require("child_process");

module.exports = async function socketPresent(input, state, config, cwd) {
  try {
    execSync("socket --version", {
      cwd,
      stdio: "pipe",
      timeout: 5000,
    });
    return {
      status: "pass",
      message: "Socket.dev CLI is installed",
      details: {},
    };
  } catch {
    return {
      status: "block",
      message:
        "Socket.dev CLI is not installed or not in PATH. Socket provides real-time malware and typosquatting detection. Install with: npm install -g @socketsecurity/cli — or run /supply-chain-defence:doctor --auto-fix",
      details: { key: "_" },
    };
  }
};
