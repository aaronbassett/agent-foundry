"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function scriptsSynced(input, state, config, cwd) {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) {
    return {
      status: "info",
      message: "CLAUDE_PLUGIN_DATA not set — cannot verify script sync",
      details: {},
    };
  }

  const versionPath = path.join(dataDir, "scripts", "VERSION");
  if (!fs.existsSync(versionPath)) {
    return {
      status: "warn",
      message: "Scripts not synced to CLAUDE_PLUGIN_DATA. Restart session to trigger sync.",
      details: {},
    };
  }

  const version = fs.readFileSync(versionPath, "utf8").trim();
  return {
    status: "pass",
    message: `Scripts synced (version ${version})`,
    details: { version },
  };
};
