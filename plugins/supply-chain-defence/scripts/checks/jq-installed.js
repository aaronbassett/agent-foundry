"use strict";
const { spawnSync } = require("child_process");

module.exports = async function jqInstalled(input, state, config, cwd) {
  const result = spawnSync("jq", ["--version"], {
    stdio: "pipe", timeout: 5000, encoding: "utf8",
  });
  if (result.status !== 0 || result.error) {
    return {
      status: "info",
      message: "jq not installed (optional — used by some advanced checks)",
      details: {},
    };
  }
  return {
    status: "pass",
    message: "jq available",
    details: {},
  };
};
