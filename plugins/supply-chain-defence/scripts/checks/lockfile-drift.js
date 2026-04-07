"use strict";

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
];

module.exports = async function lockfileDrift(input, state, config, cwd) {
  let lockfile = null;
  for (const f of LOCKFILES) {
    if (fs.existsSync(path.join(cwd, f))) {
      lockfile = f;
      break;
    }
  }

  if (!lockfile) {
    return { status: "info", message: "No lockfile found", details: {} };
  }

  try {
    const diff = execSync(`git diff --name-only -- "${lockfile}"`, {
      cwd,
      stdio: "pipe",
      timeout: 5000,
      encoding: "utf8",
    });

    const stagedDiff = execSync(
      `git diff --cached --name-only -- "${lockfile}"`,
      { cwd, stdio: "pipe", timeout: 5000, encoding: "utf8" }
    );

    const hasChanges =
      diff.trim().length > 0 || stagedDiff.trim().length > 0;

    if (!hasChanges) {
      return {
        status: "pass",
        message: `${lockfile} has no uncommitted changes`,
        details: {},
      };
    }

    let summary = "";
    try {
      summary = execSync(`git diff --stat -- "${lockfile}"`, {
        cwd,
        stdio: "pipe",
        timeout: 5000,
        encoding: "utf8",
      }).trim();
    } catch {
      summary = "Could not get diff summary";
    }

    return {
      status: "warn",
      message: `${lockfile} has uncommitted changes. This may indicate unexpected dependency modifications:\n${summary}`,
      details: { lockfile, summary },
    };
  } catch {
    return {
      status: "info",
      message: "Could not check lockfile drift — not a git repository or git unavailable",
      details: {},
    };
  }
};
