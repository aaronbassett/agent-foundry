"use strict";

const CI_COMMANDS = {
  npm: { install: "npm ci", flag: null },
  pnpm: { install: "pnpm install --frozen-lockfile", flag: "--frozen-lockfile" },
  yarn: { install: "yarn install --immutable", flag: "--immutable" },
  bun: { install: "bun install --frozen-lockfile", flag: "--frozen-lockfile" },
};

module.exports = async function ciOverInstall(input, state, config, cwd) {
  const command = (input.tool_input?.command || "").trim();
  const commandLower = command.toLowerCase();
  const pm = state.detectedPackageManager || "npm";

  const patterns = [
    /^npm\s+install\s*$/,
    /^npm\s+i\s*$/,
    /^pnpm\s+install\s*$/,
    /^pnpm\s+i\s*$/,
    /^yarn\s+install\s*$/,
    /^yarn\s*$/,
    /^bun\s+install\s*$/,
    /^bun\s+i\s*$/,
  ];

  const patternsWithFlags = [
    /^npm\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
    /^pnpm\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
    /^yarn\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
    /^bun\s+install\s+--[\w-]+(=\S+)?(\s+--[\w-]+(=\S+)?)*\s*$/,
  ];

  const isBareInstall =
    patterns.some((p) => p.test(commandLower)) ||
    patternsWithFlags.some((p) => p.test(commandLower));

  if (!isBareInstall) {
    return { status: "pass", message: "Not a bare install command", details: {} };
  }

  if (
    /\bnpm\s+ci\b/.test(commandLower) ||
    /--frozen-lockfile/.test(commandLower) ||
    /--immutable/.test(commandLower)
  ) {
    return { status: "pass", message: "Already using clean install", details: {} };
  }

  const ciInfo = CI_COMMANDS[pm] || CI_COMMANDS.npm;

  return {
    status: "block",
    message: `Use \`${ciInfo.install}\` instead of bare install. Clean installs respect the lockfile exactly and prevent unexpected version resolution. This ensures reproducible builds.`,
    details: { key: "bare-install", suggested: ciInfo.install },
  };
};
