"use strict";

const fs = require("fs");
const path = require("path");

const MIN_DAYS = 5;

// Parse .npmrc for min-release-age (value in days for npm)
function getNpmrcReleaseAge(cwd) {
  const npmrcPath = path.join(cwd, ".npmrc");
  if (!fs.existsSync(npmrcPath)) return null;
  const content = fs.readFileSync(npmrcPath, "utf8");
  const match = content.match(/min-release-age\s*=\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse pnpm-workspace.yaml for minimumReleaseAge (value in minutes for pnpm)
function getPnpmReleaseAge(cwd) {
  const wsPath = path.join(cwd, "pnpm-workspace.yaml");
  if (!fs.existsSync(wsPath)) return null;
  const content = fs.readFileSync(wsPath, "utf8");
  const match = content.match(/minimumReleaseAge\s*:\s*(\d+)/);
  if (!match) return null;
  // Convert minutes to days
  return parseInt(match[1], 10) / 1440;
}

// Extract --before date from command string
function getBeforeDate(command) {
  // Matches --before=2026-04-01 or --before 2026-04-01
  const match = command.match(/--before[= ](\d{4}-\d{2}-\d{2}(?:T[\d:.Z-]+)?)/);
  return match ? match[1] : null;
}

// Calculate how many days ago a date string is from now
function daysAgo(dateStr) {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return (now - then) / (24 * 3600 * 1000);
}

module.exports = async function beforeFlag(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();
  const minDays = config.thresholds.beforeFlagDays || MIN_DAYS;

  // Only check commands that add new packages
  const isAddingPackage =
    /^(npm|pnpm|yarn|bun)\s+(install|add|i)\s+\S/.test(command) &&
    !/^(npm)\s+ci\b/.test(command);

  if (!isAddingPackage) {
    return { status: "pass", message: "Not adding a package", details: {} };
  }

  // Check if a release-age setting exists in project config
  const npmrcAge = getNpmrcReleaseAge(cwd);
  const pnpmAge = getPnpmReleaseAge(cwd);
  const configuredAge = npmrcAge ?? pnpmAge;

  const beforeDateStr = getBeforeDate(command);

  // --- Case 1: Setting present ---
  if (configuredAge !== null) {
    if (configuredAge >= minDays) {
      return {
        status: "pass",
        message: `Release age gating configured (${configuredAge} days) — meets minimum of ${minDays} days`,
        details: {},
      };
    }

    // Setting present but too low — block-then-warn
    return {
      status: "block",
      message:
        `Release age gating is configured but set to ${configuredAge} days, which is below the recommended minimum of ${minDays} days. ` +
        `The March 2026 Axios attack used a version that existed for only 39 minutes — a short window gives attackers room to operate. ` +
        `Increase \`min-release-age\` in .npmrc to at least ${minDays}, or set \`minimumReleaseAge: ${minDays * 1440}\` in pnpm-workspace.yaml.`,
      details: { key: `age-too-low-${configuredAge}`, configuredAge, minDays },
    };
  }

  // --- Case 2: No setting, but --before flag used ---
  if (beforeDateStr) {
    const age = daysAgo(beforeDateStr);

    if (age >= minDays) {
      return {
        status: "pass",
        message: `--before ${beforeDateStr} is ${Math.floor(age)} days ago — meets minimum of ${minDays} days`,
        details: {},
      };
    }

    // --before date is too recent — block-then-warn
    return {
      status: "block",
      message:
        `--before ${beforeDateStr} is only ${Math.floor(age)} days ago, which is below the recommended minimum of ${minDays} days. ` +
        `Consider using a date at least ${minDays} days in the past, or better yet, add \`min-release-age=${minDays}\` to .npmrc ` +
        `so all installs are protected automatically.`,
      details: { key: `before-too-recent-${beforeDateStr}`, age: Math.floor(age), minDays },
    };
  }

  // --- Case 3: Neither setting nor --before ---
  const suggestedDate = new Date(Date.now() - minDays * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  return {
    status: "block",
    message:
      `No release age protection configured. Add \`min-release-age=${minDays}\` to .npmrc ` +
      `(or \`minimumReleaseAge: ${minDays * 1440}\` in pnpm-workspace.yaml) to prevent installing ` +
      `packages published in the last ${minDays} days.\n\n` +
      `Why this matters: the March 2026 Axios supply chain attack compromised versions that existed ` +
      `for only 39 minutes before being detected. A ${minDays}-day minimum gives the community time ` +
      `to detect and remove malicious versions before they reach your project.\n\n` +
      `As a workaround, you can add \`--before ${suggestedDate}\` to this command — but configuring ` +
      `the setting in .npmrc is strongly preferred as it protects all installs automatically.`,
    details: { key: command, suggestedDate },
  };
};

// Export internals for testing
if (require.main !== module) {
  module.exports.getNpmrcReleaseAge = getNpmrcReleaseAge;
  module.exports.getPnpmReleaseAge = getPnpmReleaseAge;
  module.exports.getBeforeDate = getBeforeDate;
  module.exports.daysAgo = daysAgo;
}
