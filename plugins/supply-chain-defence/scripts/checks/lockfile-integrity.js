"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function detectLockfile(cwd) {
  const lockfiles = [
    { file: "pnpm-lock.yaml", type: "pnpm" },
    { file: "package-lock.json", type: "npm" },
    { file: "yarn.lock", type: "yarn" },
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

  try {
    execSync("npx lockfile-lint --version", {
      cwd,
      stdio: "pipe",
      timeout: 10000,
    });
  } catch {
    return {
      status: "warn",
      message:
        "lockfile-lint not available. Install with: npm install -g lockfile-lint",
      details: {},
    };
  }

  try {
    const result = execSync(
      `npx lockfile-lint --path ${lockfile.file} --type ${lockfile.type} --allowed-hosts npm --validate-https`,
      { cwd, stdio: "pipe", timeout: 30000, encoding: "utf8" }
    );

    return {
      status: "pass",
      message: `Lockfile integrity check passed (${lockfile.file})`,
      details: { output: result.trim() },
    };
  } catch (err) {
    const stderr = err.stderr?.toString() || err.stdout?.toString() || "";
    return {
      status: "warn",
      message: `Lockfile integrity issues found in ${lockfile.file}:\n${stderr.trim()}`,
      details: { output: stderr.trim() },
    };
  }
};
