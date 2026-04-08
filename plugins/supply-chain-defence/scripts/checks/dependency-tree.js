"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LS_COMMANDS = {
  npm: ["npm", ["ls", "--all", "--json"]],
  pnpm: ["pnpm", ["ls", "--depth", "Infinity", "--json"]],
  yarn: ["yarn", ["info", "--all", "--json"]],
};

function countDeps(tree) {
  const seen = new Set();
  function walk(node) {
    const deps = node.dependencies || {};
    for (const [name, info] of Object.entries(deps)) {
      const key = `${name}@${info.version || "unknown"}`;
      if (!seen.has(key)) {
        seen.add(key);
        walk(info);
      }
    }
  }
  walk(tree);
  return seen.size;
}

module.exports = async function dependencyTree(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    return { status: "info", message: "No package.json found", details: {} };
  }

  const pm = state.detectedPackageManager || "npm";
  const cmdEntry = LS_COMMANDS[pm] || LS_COMMANDS.npm;

  if (!cmdEntry) {
    return {
      status: "info",
      message: `Dependency tree analysis not supported for ${pm}. Run \`${pm === "bun" ? "bun pm ls --all" : pm + " ls"}\` manually.`,
      details: {},
    };
  }

  const result = spawnSync(cmdEntry[0], cmdEntry[1], {
    cwd,
    stdio: ["pipe", "pipe", "ignore"],
    timeout: 30000,
    encoding: "utf8",
  });

  if (result.error || (result.status !== 0 && !result.stdout)) {
    return {
      status: "info",
      message: `Could not analyze dependency tree: ${result.error?.message || "command failed"}`,
      details: {},
    };
  }

  let tree;
  try {
    tree = JSON.parse(result.stdout);
    if (Array.isArray(tree)) tree = tree[0] || {};
  } catch {
    return {
      status: "info",
      message: "Dependency tree output not parseable",
      details: {},
    };
  }

  const directDeps = Object.keys(tree.dependencies || {}).length;
  const totalDeps = countDeps(tree);

  const concerns = [];
  if (totalDeps > 500) {
    concerns.push(`Large dependency tree (${totalDeps} total packages) increases attack surface`);
  }
  if (totalDeps > 1000) {
    concerns.push("Consider auditing whether all dependencies are necessary");
  }

  return {
    status: concerns.length > 0 ? "warn" : "pass",
    message:
      `Dependency tree: ${directDeps} direct, ${totalDeps} total (including transitive)` +
      (concerns.length > 0 ? "\n" + concerns.join("\n") : ""),
    details: { directDeps, totalDeps, concerns },
  };
};
