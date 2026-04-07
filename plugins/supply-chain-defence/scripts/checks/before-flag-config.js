"use strict";
const fs = require("fs");
const path = require("path");

module.exports = async function beforeFlagConfig(input, state, config, cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");
  if (!fs.existsSync(npmrcPath)) {
    return { status: "warn", message: "No .npmrc — min-release-age not configured", details: {} };
  }
  const content = fs.readFileSync(npmrcPath, "utf8");
  if (/min-release-age\s*=/.test(content)) {
    return { status: "pass", message: "min-release-age is configured in .npmrc", details: {} };
  }
  return { status: "warn", message: "min-release-age not set in .npmrc. Add min-release-age=5 to prevent installing freshly published packages.", details: {} };
};
