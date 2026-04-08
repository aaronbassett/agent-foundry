"use strict";

const {
  getNpmrcReleaseAge,
  getPnpmReleaseAge,
  getYarnReleaseAge,
  getBunfigReleaseAge,
} = require("./before-flag");

module.exports = async function beforeFlagConfig(input, state, config, cwd) {
  const npmrcAge = getNpmrcReleaseAge(cwd);
  const pnpmAge = getPnpmReleaseAge(cwd);
  const yarnAge = getYarnReleaseAge(cwd);
  const bunAge = getBunfigReleaseAge(cwd);
  const configuredAge = npmrcAge ?? pnpmAge ?? yarnAge ?? bunAge;

  if (configuredAge === null) {
    return {
      status: "warn",
      message:
        "No release age gating configured in any package manager config. " +
        "Add min-release-age to .npmrc, minimumReleaseAge to pnpm-workspace.yaml, " +
        "npmMinimumReleaseAge to .yarnrc.yml, or minimumReleaseAge under [install] in bunfig.toml.",
      details: {},
    };
  }

  const minDays = config.thresholds.beforeFlagDays || 5;
  if (configuredAge >= minDays) {
    return {
      status: "pass",
      message: `Release age gating configured (${configuredAge} days)`,
      details: { configuredAge },
    };
  }

  return {
    status: "warn",
    message:
      `Release age gating set to ${configuredAge} days, below recommended minimum of ${minDays} days.`,
    details: { configuredAge, minDays },
  };
};
