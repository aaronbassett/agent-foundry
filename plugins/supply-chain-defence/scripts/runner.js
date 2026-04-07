#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = __dirname;
const CONFIG_PATH = path.join(SCRIPT_DIR, "config.json");
const STATE_FILENAME = ".claude/agent-foundry/supply-chain-defence.local.json";

// --- Argument parsing ---

function parseArgs(argv) {
  const args = { profile: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--profile" && argv[i + 1]) {
      args.profile = argv[i + 1];
      i++;
    }
  }
  return args;
}

// --- Stdin reading ---

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // If stdin is not piped (e.g. running manually), resolve empty after timeout
    setTimeout(() => resolve({}), 100);
  });
}

// --- State file ---

function readState(cwd) {
  const statePath = path.join(cwd, STATE_FILENAME);
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { detectedPackageManager: null, lastDeepAudit: null, blocked: {} };
  }
}

function writeState(cwd, state) {
  const statePath = path.join(cwd, STATE_FILENAME);
  const stateDir = path.dirname(statePath);
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

// --- Severity logic ---

function shouldBlock(checkName, checkKey, state, config) {
  const severity = config.severity[checkName];
  if (!severity) return false;
  if (severity === "always-block") return true;
  if (severity === "report") return false;

  if (severity === "block-then-warn") {
    const ttlMs = (config.thresholds.blockThenWarnTTLHours || 8) * 3600 * 1000;
    const category = state.blocked || {};
    const entries = category[checkName] || {};
    const key = checkKey || "_";
    const lastBlocked = entries[key];
    if (lastBlocked && Date.now() - lastBlocked < ttlMs) {
      return false; // Within TTL — warn instead
    }
    return true; // First time or TTL expired — block
  }

  return false;
}

function recordBlock(checkName, checkKey, state) {
  if (!state.blocked) state.blocked = {};
  if (!state.blocked[checkName]) state.blocked[checkName] = {};
  state.blocked[checkName][checkKey || "_"] = Date.now();
}

// --- Check loading and execution ---

async function runCheck(checkName, input, state, config, cwd) {
  const checkPath = path.join(SCRIPT_DIR, "checks", `${checkName}.js`);
  if (!fs.existsSync(checkPath)) {
    return {
      status: "info",
      message: `Check "${checkName}" not found at ${checkPath}`,
      details: {},
    };
  }
  try {
    const check = require(checkPath);
    return await check(input, state, config, cwd);
  } catch (err) {
    return {
      status: "info",
      message: `Check "${checkName}" threw: ${err.message}`,
      details: { error: err.message },
    };
  }
}

// --- Output formatting ---

function formatPreToolUseOutput(results, state, config) {
  // Find the first blocking result
  for (const r of results) {
    if (r.status !== "block") continue;

    const isBlocked = shouldBlock(r.checkName, r.checkKey, state, config);
    if (isBlocked) {
      recordBlock(r.checkName, r.checkKey, state);
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            r.message +
            "\n\nThis check will not block again for the next " +
            config.thresholds.blockThenWarnTTLHours +
            " hours.",
        },
      };
    }
  }

  // Collect warnings
  const warnings = results.filter(
    (r) => r.status === "warn" || r.status === "block"
  );
  if (warnings.length > 0) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        additionalContext:
          "Supply chain warnings (previously blocked, now allowed):\n" +
          warnings.map((w) => `- ${w.message}`).join("\n"),
      },
    };
  }

  // All passed
  return null;
}

function formatAlwaysBlockOutput(results) {
  for (const r of results) {
    if (r.status === "block") {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: r.message,
        },
      };
    }
  }
  return null;
}

function formatSessionStartOutput(results) {
  const critical = results.filter(
    (r) => r.status === "block" || r.status === "warn"
  );
  const info = results.filter(
    (r) => r.status === "pass" || r.status === "info"
  );

  const contextLines = results.map(
    (r) => `[${r.status.toUpperCase()}] ${r.message}`
  );

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        "Supply chain defence status:\n" + contextLines.join("\n"),
    },
  };

  if (critical.length > 0) {
    output.systemMessage =
      "Supply chain issues detected:\n" +
      critical.map((c) => `- ${c.message}`).join("\n");
  }

  return output;
}

function formatAsyncOutput(results) {
  const issues = results.filter(
    (r) => r.status === "warn" || r.status === "block"
  );
  if (issues.length === 0) return null;

  return {
    systemMessage:
      "Supply chain audit findings:\n" +
      issues.map((i) => `- [${i.status.toUpperCase()}] ${i.message}`).join("\n"),
  };
}

function formatContextOutput(results) {
  const lines = results
    .filter((r) => r.message)
    .map((r) => r.message);
  if (lines.length === 0) return null;

  return {
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: lines.join("\n"),
    },
  };
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv);
  if (!args.profile) {
    console.error("Usage: runner.js --profile <profile-name>");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const profile = config.profiles[args.profile];
  if (!profile) {
    console.error(`Unknown profile: ${args.profile}`);
    process.exit(1);
  }

  const input = await readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);
  const hookEvent = input.hook_event_name || "";

  // Run all checks in the profile
  const results = [];
  for (const checkName of profile) {
    const result = await runCheck(checkName, input, state, config, cwd);
    result.checkName = checkName;
    result.checkKey = result.details?.key || null;
    results.push(result);
  }

  // Format output based on hook event and profile
  let output = null;

  if (args.profile === "edit-guard" || args.profile === "write-guard") {
    // Always-block profiles
    output = formatAlwaysBlockOutput(results);
  } else if (args.profile === "bash-guard") {
    output = formatPreToolUseOutput(results, state, config);
  } else if (args.profile === "quick") {
    output = formatSessionStartOutput(results);
  } else if (
    args.profile === "deep" ||
    args.profile === "post-install-audit" ||
    args.profile === "npx-post-audit" ||
    args.profile === "file-changed"
  ) {
    output = formatAsyncOutput(results);
  } else if (
    args.profile === "pre-compact" ||
    args.profile === "subagent-context"
  ) {
    output = formatContextOutput(results);
  } else if (args.profile === "doctor" || args.profile === "review") {
    // Doctor and review output all results for the skill/command to format
    output = { results: results };
  }

  // Write updated state
  writeState(cwd, state);

  // Output JSON
  if (output) {
    console.log(JSON.stringify(output));
  }
}

// Export internals for testing
if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  module.exports = {
    shouldBlock,
    recordBlock,
    formatPreToolUseOutput,
    formatAlwaysBlockOutput,
    formatSessionStartOutput,
    formatAsyncOutput,
    formatContextOutput,
    readState,
    writeState,
  };
}
