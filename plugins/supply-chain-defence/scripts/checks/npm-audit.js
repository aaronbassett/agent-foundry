"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const AUDIT_COMMANDS = {
  npm: "npm audit --json",
  pnpm: "pnpm audit --json",
  yarn: "yarn npm audit --json",
  bun: null, // bun has no audit command
};

module.exports = async function npmAudit(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const pm = state.detectedPackageManager || "npm";
  const cmd = pm in AUDIT_COMMANDS ? AUDIT_COMMANDS[pm] : AUDIT_COMMANDS.npm;

  if (!cmd) {
    return {
      status: "info",
      message: `${pm} does not have a built-in audit command. Run \`npm audit\` manually for vulnerability scanning.`,
      details: {},
    };
  }

  try {
    const output = execSync(cmd, {
      cwd,
      stdio: "pipe",
      timeout: 60000,
      encoding: "utf8",
    });

    return {
      status: "pass",
      message: `${pm} audit: no vulnerabilities found`,
      details: {},
    };
  } catch (err) {
    const stdout = err.stdout?.toString() || "";

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
  }
};
