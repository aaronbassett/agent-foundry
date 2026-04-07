"use strict";

module.exports = async function beforeFlag(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();

  const isAddingPackage =
    /^(npm|pnpm|yarn|bun)\s+(install|add|i)\s+\S/.test(command) &&
    !/^(npm)\s+ci\b/.test(command);

  if (!isAddingPackage) {
    return { status: "pass", message: "Not adding a package", details: {} };
  }

  if (/--before\b/.test(command)) {
    return { status: "pass", message: "--before flag already present", details: {} };
  }

  const days = config.thresholds.beforeFlagDays || 5;
  const beforeDate = new Date(Date.now() - days * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  return {
    status: "block",
    message:
      `Add \`--before ${beforeDate}\` to avoid installing packages published in the last ${days} days. ` +
      `Recently published versions are higher risk — the Axios attack used a version that existed for only 39 minutes. ` +
      `This flag ensures you only install versions that have been available long enough for the community to detect issues.`,
    details: { key: command, suggestedDate: beforeDate },
  };
};
