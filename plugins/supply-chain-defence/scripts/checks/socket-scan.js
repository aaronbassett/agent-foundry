"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function socketScan(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  // Check if socket CLI is available
  try {
    execSync("socket --version", { cwd, stdio: "pipe", timeout: 5000 });
  } catch {
    return {
      status: "info",
      message: "Socket.dev CLI not available — skipping scan. Install: npm install -g @socketsecurity/cli",
      details: {},
    };
  }

  try {
    const output = execSync("socket report create --json 2>/dev/null", {
      cwd,
      stdio: "pipe",
      timeout: 60000,
      encoding: "utf8",
    });

    let report;
    try {
      report = JSON.parse(output);
    } catch {
      return {
        status: "pass",
        message: "Socket scan completed (output not parseable as JSON)",
        details: { raw: output.slice(0, 500) },
      };
    }

    // Extract issue counts if available
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
  } catch (err) {
    const stderr = err.stderr?.toString() || "";
    // Socket CLI might require auth or have other issues
    if (stderr.includes("auth") || stderr.includes("login") || stderr.includes("API key")) {
      return {
        status: "info",
        message: "Socket.dev CLI requires authentication. Visit https://socket.dev to configure your API key.",
        details: {},
      };
    }
    return {
      status: "info",
      message: "Socket scan failed: " + (stderr.slice(0, 200) || err.message),
      details: {},
    };
  }
};
