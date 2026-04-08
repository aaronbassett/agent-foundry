"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
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

  const opts = { cwd, stdio: "pipe", timeout: 5000, encoding: "utf8" };

  const diff = spawnSync("git", ["diff", "--name-only", "--", lockfile], opts);
  if (diff.error || diff.status === null) {
    return {
      status: "info",
      message: "Could not check lockfile drift — not a git repository or git unavailable",
      details: {},
    };
  }

  const stagedDiff = spawnSync("git", ["diff", "--cached", "--name-only", "--", lockfile], opts);

  const hasChanges =
    (diff.stdout || "").trim().length > 0 ||
    (stagedDiff.stdout || "").trim().length > 0;

  if (!hasChanges) {
    return {
      status: "pass",
      message: `${lockfile} has no uncommitted changes`,
      details: {},
    };
  }

  const stat = spawnSync("git", ["diff", "--stat", "--", lockfile], opts);
  const summary = (stat.status === 0 && stat.stdout)
    ? stat.stdout.trim()
    : "Could not get diff summary";

  return {
    status: "warn",
    message: `${lockfile} has uncommitted changes. This may indicate unexpected dependency modifications:\n${summary}`,
    details: { lockfile, summary },
  };
};
