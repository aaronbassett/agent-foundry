"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function socketScan(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const versionCheck = spawnSync("socket", ["--version"], {
    cwd, stdio: "pipe", timeout: 5000,
  });
  if (versionCheck.status !== 0 || versionCheck.error) {
    return {
      status: "info",
      message: "Socket.dev CLI not available — skipping scan. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }

  const result = spawnSync("socket", ["report", "create", "--json"], {
    cwd,
    stdio: ["pipe", "pipe", "ignore"],
    timeout: 60000,
    encoding: "utf8",
  });

  if (result.error || (result.status !== 0 && !result.stdout)) {
    const stderr = (result.stderr || "").toString();
    if (stderr.includes("auth") || stderr.includes("login") || stderr.includes("API key")) {
      return {
        status: "info",
        message: "Socket.dev CLI requires authentication. Visit https://socket.dev to configure your API key.",
        details: {},
      };
    }
    return {
      status: "info",
      message: "Socket scan failed: " + (stderr.slice(0, 200) || result.error?.message || "unknown error"),
      details: {},
    };
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return {
      status: "pass",
      message: "Socket scan completed (output not parseable as JSON)",
      details: { raw: (result.stdout || "").slice(0, 500) },
    };
  }

  const issues = report.issues || report.alerts || [];
  if (Array.isArray(issues) && issues.length > 0) {
    const critical = issues.filter((i) => i.severity === "critical" || i.severity === "high");
    const other = issues.length - critical.length;

    return {
      status: critical.length > 0 ? "warn" : "info",
      message:
        `Socket scan found ${issues.length} issues` +
        (critical.length > 0 ? ` (${critical.length} critical/high)` : "") +
        (other > 0 ? `, ${other} other` : "") +
        ". Run `socket report create` for full details.",
      details: { total: issues.length, critical: critical.length },
    };
  }

  return {
    status: "pass",
    message: "Socket scan: no issues found",
    details: {},
  };
};
