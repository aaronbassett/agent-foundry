"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = async function provenanceCheck(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const hasLockfile =
    fs.existsSync(path.join(cwd, "package-lock.json")) ||
    fs.existsSync(path.join(cwd, "npm-shrinkwrap.json"));

  if (!hasLockfile) {
    return {
      status: "info",
      message: "npm audit signatures requires package-lock.json — skipping provenance check",
      details: {},
    };
  }

  const result = spawnSync("npm", ["audit", "signatures"], {
    cwd,
    stdio: "pipe",
    timeout: 30000,
    encoding: "utf8",
  });

  const output = ((result.stdout || "") + "\n" + (result.stderr || "")).trim();

  if (result.error) {
    return {
      status: "info",
      message: "Provenance check could not run: " + (result.error.message || "unknown error"),
      details: {},
    };
  }

  const verified = output.match(/(\d+) packages have verified/);
  const missing = output.match(/(\d+) packages have missing/);
  const invalid = output.match(/(\d+) packages have invalid/);

  const verifiedCount = verified ? parseInt(verified[1], 10) : 0;
  const missingCount = missing ? parseInt(missing[1], 10) : 0;
  const invalidCount = invalid ? parseInt(invalid[1], 10) : 0;

  if (invalidCount > 0) {
    return {
      status: "warn",
      message:
        `Provenance check: ${invalidCount} packages have INVALID signatures. ` +
        `${verifiedCount} verified, ${missingCount} missing. ` +
        "Invalid signatures may indicate tampering. Run `npm audit signatures` for details.",
      details: { verified: verifiedCount, missing: missingCount, invalid: invalidCount },
    };
  }

  if (missingCount > 0) {
    return {
      status: "info",
      message:
        `Provenance check: ${verifiedCount} verified, ${missingCount} without provenance. ` +
        "Packages without provenance were published manually (not via CI/CD).",
      details: { verified: verifiedCount, missing: missingCount, invalid: 0 },
    };
  }

  if (verifiedCount > 0) {
    return {
      status: "pass",
      message: `Provenance check: ${verifiedCount} packages have verified signatures`,
      details: { verified: verifiedCount, missing: 0, invalid: 0 },
    };
  }

  return {
    status: "info",
    message: "Provenance check could not run: " + (output.slice(0, 200) || "no output"),
    details: {},
  };
};
