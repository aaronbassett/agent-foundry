"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const AUDIT_COMMANDS = {
  npm: ["npm", ["audit", "--json"]],
  pnpm: ["pnpm", ["audit", "--json"]],
  yarn: ["yarn", ["npm", "audit", "--json"]],
  bun: ["bun", ["audit", "--json"]],
};

module.exports = async function npmAudit(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const pm = state.detectedPackageManager || "npm";
  const cmdEntry = AUDIT_COMMANDS[pm] || AUDIT_COMMANDS.npm;

  const result = spawnSync(cmdEntry[0], cmdEntry[1], {
    cwd,
    stdio: "pipe",
    timeout: 60000,
    encoding: "utf8",
  });

  if (result.status === 0) {
    return {
      status: "pass",
      message: `${pm} audit: no vulnerabilities found`,
      details: {},
    };
  }

  const stdout = result.stdout || "";

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return {
      status: "warn",
      message: `${pm} audit returned non-parseable output`,
      details: { raw: stdout.slice(0, 500) },
    };
  }

  const vulns = parsed.metadata?.vulnerabilities || {};
  const total =
    (vulns.critical || 0) +
    (vulns.high || 0) +
    (vulns.moderate || 0) +
    (vulns.low || 0);

  if (total === 0) {
    return {
      status: "pass",
      message: `${pm} audit: no vulnerabilities found`,
      details: {},
    };
  }

  const summary = [];
  if (vulns.critical) summary.push(`${vulns.critical} critical`);
  if (vulns.high) summary.push(`${vulns.high} high`);
  if (vulns.moderate) summary.push(`${vulns.moderate} moderate`);
  if (vulns.low) summary.push(`${vulns.low} low`);

  return {
    status: "warn",
    message: `${pm} audit found ${total} vulnerabilities: ${summary.join(", ")}. Run \`${pm} audit\` for details.`,
    details: { vulnerabilities: vulns, total },
  };
};
