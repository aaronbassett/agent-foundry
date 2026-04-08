"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function detectLockfile(cwd) {
  const lockfiles = [
    { file: "pnpm-lock.yaml", type: "pnpm" },
    { file: "package-lock.json", type: "npm" },
    { file: "yarn.lock", type: "yarn" },
    { file: "bun.lock", type: "bun" },
  ];
  for (const { file, type } of lockfiles) {
    if (fs.existsSync(path.join(cwd, file))) {
      return { file, type };
    }
  }
  return null;
}

module.exports = async function lockfileIntegrity(input, state, config, cwd) {
  const lockfile = detectLockfile(cwd);
  if (!lockfile) {
    return {
      status: "info",
      message: "No lockfile found — skipping integrity check",
      details: {},
    };
  }

  const versionCheck = spawnSync("npx", ["lockfile-lint", "--version"], {
    cwd,
    stdio: "pipe",
    timeout: 10000,
  });
  if (versionCheck.status !== 0 || versionCheck.error) {
    return {
      status: "warn",
      message:
        "lockfile-lint not available. Install with: npm install -g lockfile-lint",
      details: {},
    };
  }

  const result = spawnSync(
    "npx",
    ["lockfile-lint", "--path", lockfile.file, "--type", lockfile.type, "--allowed-hosts", "npm", "--validate-https"],
    { cwd, stdio: "pipe", timeout: 30000, encoding: "utf8" }
  );

  if (result.status === 0) {
    return {
      status: "pass",
      message: `Lockfile integrity check passed (${lockfile.file})`,
      details: { output: (result.stdout || "").trim() },
    };
  }

  const stderr = (result.stderr || result.stdout || "").trim();
  return {
    status: "warn",
    message: `Lockfile integrity issues found in ${lockfile.file}:\n${stderr}`,
    details: { output: stderr },
  };
};
