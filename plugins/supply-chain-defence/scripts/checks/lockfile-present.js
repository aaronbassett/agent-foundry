"use strict";

const fs = require("fs");
const path = require("path");

const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
];

module.exports = async function lockfilePresent(input, state, config, cwd) {
  for (const file of LOCKFILES) {
    if (fs.existsSync(path.join(cwd, file))) {
      return {
        status: "pass",
        message: `Lockfile found: ${file}`,
        details: { lockfile: file },
      };
    }
  }

  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return {
      status: "info",
      message: "No package.json — not a Node.js project",
      details: {},
    };
  }

  return {
    status: "warn",
    message:
      "No lockfile found. Without a lockfile, dependency versions are not pinned and installs are not reproducible. Run your package manager to generate one.",
    details: {},
  };
};
