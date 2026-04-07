"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_SETTINGS = {
  "ignore-scripts": "true",
  "package-lock": "true",
  "registry": "https://registry.npmjs.org/",
  "strict-ssl": "true",
  "npx-auto-install": "false",
  "save-exact": "true",
};

const RECOMMENDED_SETTINGS = {
  "audit-level": ["low", "moderate"],
  "min-release-age": null,
};

function parseNpmrc(content) {
  const settings = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    settings[key] = value;
  }
  return settings;
}

module.exports = async function npmrcHardened(input, state, config, cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");

  if (!fs.existsSync(npmrcPath)) {
    return {
      status: "warn",
      message:
        "No .npmrc file found. Project has no npm security configuration. Run /supply-chain-defence:harden to create one.",
      details: { missing: true },
    };
  }

  const content = fs.readFileSync(npmrcPath, "utf8");
  const settings = parseNpmrc(content);
  const missing = [];
  const wrong = [];

  for (const [key, expected] of Object.entries(REQUIRED_SETTINGS)) {
    if (!(key in settings)) {
      missing.push(key);
    } else if (settings[key] !== expected) {
      wrong.push(`${key}=${settings[key]} (expected ${expected})`);
    }
  }

  for (const [key, expected] of Object.entries(RECOMMENDED_SETTINGS)) {
    if (!(key in settings)) {
      missing.push(`${key} (recommended)`);
    } else if (Array.isArray(expected) && !expected.includes(settings[key])) {
      wrong.push(
        `${key}=${settings[key]} (recommended: ${expected.join(" or ")})`
      );
    }
  }

  if (missing.length === 0 && wrong.length === 0) {
    return {
      status: "pass",
      message: ".npmrc is properly hardened",
      details: { settings },
    };
  }

  const issues = [];
  if (missing.length > 0) issues.push(`Missing: ${missing.join(", ")}`);
  if (wrong.length > 0) issues.push(`Incorrect: ${wrong.join(", ")}`);

  return {
    status: "warn",
    message: `.npmrc needs hardening. ${issues.join(". ")}. Run /supply-chain-defence:harden to fix.`,
    details: { missing, wrong, settings },
  };
};
