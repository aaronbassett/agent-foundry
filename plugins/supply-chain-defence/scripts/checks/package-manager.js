"use strict";

const fs = require("fs");
const path = require("path");

const LOCKFILE_MAP = [
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "package-lock.json", pm: "npm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "bun.lockb", pm: "bun" },
];

module.exports = async function packageManager(input, state, config, cwd) {
  for (const { file, pm } of LOCKFILE_MAP) {
    if (fs.existsSync(path.join(cwd, file))) {
      state.detectedPackageManager = pm;
      return {
        status: "pass",
        message: `Package manager detected: ${pm} (from ${file})`,
        details: { pm, lockfile: file },
      };
    }
  }

  if (fs.existsSync(path.join(cwd, "package.json"))) {
    state.detectedPackageManager = "pnpm";
    return {
      status: "warn",
      message:
        "No lockfile found but package.json exists. Defaulting to pnpm. Run `pnpm install` to generate a lockfile.",
      details: { pm: "pnpm", lockfile: null },
    };
  }

  return {
    status: "info",
    message: "No package.json found — not a Node.js project",
    details: { pm: null, lockfile: null },
  };
};
