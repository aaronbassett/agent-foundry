"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = async function npmrcChanged(input, state, config, cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");

  if (!fs.existsSync(npmrcPath)) {
    return {
      status: "warn",
      message: ".npmrc was deleted. Project no longer has npm security configuration.",
      details: {},
    };
  }

  const opts = { cwd, stdio: "pipe", timeout: 5000, encoding: "utf8" };

  const diff = spawnSync("git", ["diff", "--", ".npmrc"], opts);
  if (diff.error || diff.status === null) {
    return {
      status: "info",
      message: ".npmrc change detected — not a git repository, cannot diff.",
      details: {},
    };
  }

  const hasDiff = (diff.stdout || "").trim().length > 0;

  if (!hasDiff) {
    const stagedDiff = spawnSync("git", ["diff", "--cached", "--", ".npmrc"], opts);
    const hasStaged = (stagedDiff.stdout || "").trim().length > 0;

    if (!hasStaged) {
      return {
        status: "pass",
        message: ".npmrc has no uncommitted changes",
        details: {},
      };
    }
  }

  const content = fs.readFileSync(npmrcPath, "utf8");
  const concerns = [];

  if (!/ignore-scripts\s*=\s*true/.test(content)) {
    concerns.push("ignore-scripts is not set to true");
  }
  if (!/strict-ssl\s*=\s*true/.test(content)) {
    concerns.push("strict-ssl is not set to true");
  }
  if (/ignore-scripts\s*=\s*false/.test(content)) {
    concerns.push("ignore-scripts was set to false — lifecycle scripts will run on install");
  }

  if (concerns.length > 0) {
    return {
      status: "warn",
      message:
        ".npmrc was modified. Security concerns:\n" +
        concerns.map((c) => `- ${c}`).join("\n"),
      details: { concerns },
    };
  }

  return {
    status: "info",
    message: ".npmrc was modified but security settings appear intact.",
    details: {},
  };
};
