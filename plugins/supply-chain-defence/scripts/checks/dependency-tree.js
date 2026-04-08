"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LS_COMMANDS = {
  npm: "npm ls --all --json 2>/dev/null",
  pnpm: "pnpm ls --depth Infinity --json 2>/dev/null",
  yarn: "yarn info --all --json 2>/dev/null",
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
  const cmd = LS_COMMANDS[pm] || LS_COMMANDS.npm;

  try {
    const output = execSync(cmd, {
      cwd,
      stdio: "pipe",
      timeout: 30000,
      encoding: "utf8",
    });

    let tree;
    try {
      tree = JSON.parse(output);
      // pnpm returns an array
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
  } catch (err) {
    return {
      status: "info",
      message: `Could not analyze dependency tree: ${err.message?.slice(0, 100) || "unknown error"}`,
      details: {},
    };
  }
};
