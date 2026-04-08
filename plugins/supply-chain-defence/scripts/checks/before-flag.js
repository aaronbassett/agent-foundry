"use strict";

const fs = require("fs");
const path = require("path");

const MIN_DAYS = 5;
const STATE_FILENAME = ".claude/agent-foundry/supply-chain-defence.local.json";

const PM_INSTRUCTIONS = {
  npm: {
    name: "npm",
    file: ".npmrc",
    setting: "min-release-age",
    example: (days) => `Add \`min-release-age=${days}\` to .npmrc`,
  },
  pnpm: {
    name: "pnpm",
    file: "pnpm-workspace.yaml",
    setting: "minimumReleaseAge",
    example: (days) =>
      `Add \`minimumReleaseAge: ${days * 1440}\` to pnpm-workspace.yaml (value is in minutes)`,
  },
  yarn: {
    name: "yarn",
    file: ".yarnrc.yml",
    setting: "npmMinimumReleaseAge",
    example: (days) =>
      `Add \`npmMinimumReleaseAge: "${days}d"\` to .yarnrc.yml`,
  },
};

// Build PM-specific configuration instructions, with detected PM first
function buildConfigInstructions(minDays, detectedPm) {
  const allPms = ["npm", "pnpm", "yarn"];
  const primary = detectedPm && PM_INSTRUCTIONS[detectedPm] ? detectedPm : null;
  const others = allPms.filter((pm) => pm !== primary);

  let instructions = "";

  if (primary) {
    const info = PM_INSTRUCTIONS[primary];
    instructions +=
      `This project uses ${info.name}. To configure:\n` +
      `  ${info.example(minDays)}\n`;

    if (others.length > 0) {
      instructions += `\nIf you use a different package manager:\n`;
      for (const pm of others) {
        instructions += `  ${PM_INSTRUCTIONS[pm].example(minDays)}\n`;
      }
    }
  } else {
    instructions += `To configure for your package manager:\n`;
    for (const pm of allPms) {
      instructions += `  ${PM_INSTRUCTIONS[pm].example(minDays)}\n`;
    }
  }

  return instructions;
}

// Read detected package manager from state file
function getDetectedPm(cwd, state) {
  // Prefer state passed by the runner (already loaded)
  if (state?.detectedPackageManager) return state.detectedPackageManager;

  // Fall back to reading state file directly
  const statePath = path.join(cwd, STATE_FILENAME);
  try {
    const data = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return data.detectedPackageManager || null;
  } catch {
    return null;
  }
}

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

// Parse .yarnrc.yml for npmMinimumReleaseAge
// Accepts minutes (integer) or duration strings ("7d", "1w", "168h")
function getYarnReleaseAge(cwd) {
  const yarnrcPath = path.join(cwd, ".yarnrc.yml");
  if (!fs.existsSync(yarnrcPath)) return null;
  const content = fs.readFileSync(yarnrcPath, "utf8");
  const match = content.match(/npmMinimumReleaseAge\s*:\s*["']?(\S+?)["']?\s*$/m);
  if (!match) return null;
  return parseDurationToDays(match[1]);
}

// Parse a duration value to days
// Supports: plain minutes (integer), or suffixed strings: "5d", "1w", "168h", "10080m"
function parseDurationToDays(value) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;

  // Plain integer = minutes
  if (/^\d+$/.test(value)) return num / 1440;

  const suffix = value.replace(/^\d+/, "");
  switch (suffix) {
    case "m": return num / 1440;
    case "h": return num / 24;
    case "d": return num;
    case "w": return num * 7;
    default: return num / 1440; // Default to minutes
  }
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

  const detectedPm = getDetectedPm(cwd, state);
  const configInstructions = buildConfigInstructions(minDays, detectedPm);

  // Check if a release-age setting exists in project config
  const npmrcAge = getNpmrcReleaseAge(cwd);
  const pnpmAge = getPnpmReleaseAge(cwd);
  const yarnAge = getYarnReleaseAge(cwd);
  const configuredAge = npmrcAge ?? pnpmAge ?? yarnAge;

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
        `While high-profile attacks are caught quickly, many malicious packages go undetected for days. ` +
        `A ${minDays}-day window gives security tools and the community time to flag less-visible threats.\n\n` +
        configInstructions,
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
        `Consider using a date at least ${minDays} days in the past.\n\n` +
        `Configuring a minimum release age in your package manager's settings is strongly preferred ` +
        `as it protects all installs automatically.\n\n` +
        configInstructions,
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
      `No release age protection configured.\n\n` +
      `Why this matters: while high-profile attacks are caught quickly, many malicious packages go ` +
      `undetected for days or weeks. In 2025 alone, over 450,000 malicious npm packages were published. ` +
      `A ${minDays}-day minimum gives security tools and the community time to flag threats before ` +
      `they reach your project.\n\n` +
      `Configuring a minimum release age in your package manager's settings is strongly preferred ` +
      `as it protects all installs automatically.\n\n` +
      configInstructions +
      `\nAs a workaround for this specific command, you can add \`--before ${suggestedDate}\` — ` +
      `but this only applies to a single install and must be repeated each time.`,
    details: { key: "no-release-age-configured", suggestedDate },
  };
};

// Export internals for testing
if (require.main !== module) {
  module.exports.getNpmrcReleaseAge = getNpmrcReleaseAge;
  module.exports.getPnpmReleaseAge = getPnpmReleaseAge;
  module.exports.getYarnReleaseAge = getYarnReleaseAge;
  module.exports.parseDurationToDays = parseDurationToDays;
  module.exports.getBeforeDate = getBeforeDate;
  module.exports.daysAgo = daysAgo;
  module.exports.buildConfigInstructions = buildConfigInstructions;
}
