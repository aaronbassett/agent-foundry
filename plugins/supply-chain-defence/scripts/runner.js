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
  if (process.stdin.isTTY) return {};
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
  try {
    const statePath = path.join(cwd, STATE_FILENAME);
    const stateDir = path.dirname(statePath);
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  } catch {
    // Non-blocking — state persistence is best-effort
  }
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
//
// Each hook event has its own decision control pattern per the docs:
//
// PreToolUse:
//   hookSpecificOutput.permissionDecision (allow/deny/ask/defer)
//   hookSpecificOutput.permissionDecisionReason (for deny: shown to Claude)
//   hookSpecificOutput.additionalContext (added to Claude's context)
//
// SessionStart:
//   hookSpecificOutput.additionalContext (added to Claude's context)
//   systemMessage (warning shown to user, NOT Claude)
//   Plain stdout text is also added as context for Claude
//
// PostToolUse:
//   Top-level decision: "block" with reason (shown to Claude)
//   hookSpecificOutput.additionalContext
//
// SubagentStart:
//   hookSpecificOutput.additionalContext (added to subagent's context)
//
// Async hooks (any event):
//   systemMessage and additionalContext delivered to Claude on next turn
//   Cannot block — action already proceeded
//
// FileChanged, PreCompact, PostCompact:
//   No decision control. Side effects only.
//   systemMessage shown to user only (not Claude)
//

// PreToolUse: block-then-warn pattern
function formatPreToolUseOutput(results, state, config) {
  // Find the first blocking result
  for (const r of results) {
    if (r.status !== "block") continue;

    const isBlocked = shouldBlock(r.checkName, r.checkKey, state, config);
    if (isBlocked) {
      recordBlock(r.checkName, r.checkKey, state);
      // deny: permissionDecisionReason is shown to Claude
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

  // Collect warnings (checks that returned block but are within TTL)
  const warnings = results.filter(
    (r) => r.status === "warn" || r.status === "block"
  );
  if (warnings.length > 0) {
    // allow: additionalContext is added to Claude's context
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        additionalContext:
          "Supply chain warnings:\n" +
          warnings.map((w) => `- ${w.message}`).join("\n"),
      },
    };
  }

  // All passed — exit 0 with no output means allow
  return null;
}

// PreToolUse: always-block pattern (dep-direct-edit)
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

// SessionStart: additionalContext goes to Claude, systemMessage shown to user
function formatSessionStartOutput(results) {
  const critical = results.filter(
    (r) => r.status === "block" || r.status === "warn"
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

  // systemMessage is shown to the user (not Claude) as a warning
  if (critical.length > 0) {
    output.systemMessage =
      "Supply chain issues detected:\n" +
      critical.map((c) => `- ${c.message}`).join("\n");
  }

  return output;
}

// Async hooks: systemMessage delivered to Claude on next turn
// Used for deep audit, post-install-audit, npx-post-audit
function formatAsyncOutput(results) {
  const issues = results.filter(
    (r) => r.status === "warn" || r.status === "block"
  );
  if (issues.length === 0) return null;

  // For async hooks, systemMessage is delivered to Claude on next turn
  return {
    systemMessage:
      "Supply chain audit findings:\n" +
      issues.map((i) => `- [${i.status.toUpperCase()}] ${i.message}`).join("\n"),
  };
}

// SubagentStart: additionalContext injected into subagent's context
function formatSubagentStartOutput(results) {
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

// PreCompact/FileChanged: no decision control, no hookSpecificOutput
// These events only support side effects. systemMessage is shown to user only.
// For PreCompact we write context to state file so SessionStart can re-inject it.
function formatSideEffectOutput(results, state) {
  const lines = results
    .filter((r) => r.message)
    .map((r) => r.message);

  // Persist to state file so it survives compaction
  if (lines.length > 0) {
    state.lastSecuritySummary = lines.join("\n");
  }

  // systemMessage shown to user only — can't inject into Claude's context here
  return lines.length > 0
    ? { systemMessage: "Supply chain context preserved for next session." }
    : null;
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

  // Format output based on hook event name and profile.
  // Use hook_event_name from stdin to pick the correct output format,
  // with profile as a secondary signal for PreToolUse variants.
  let output = null;

  switch (hookEvent) {
    case "PreToolUse":
      if (args.profile === "edit-guard" || args.profile === "write-guard") {
        output = formatAlwaysBlockOutput(results);
      } else {
        output = formatPreToolUseOutput(results, state, config);
      }
      break;

    case "SessionStart":
      output = formatSessionStartOutput(results);
      break;

    case "SubagentStart":
      output = formatSubagentStartOutput(results);
      break;

    case "PreCompact":
    case "FileChanged":
      // No decision control — side effects only
      output = formatSideEffectOutput(results, state);
      break;

    case "PostToolUse":
      // All our PostToolUse hooks are async, so use async formatter
      output = formatAsyncOutput(results);
      break;

    default:
      // For doctor/review (called from skills/commands, not hooks)
      // or any unknown event, return raw results
      if (args.profile === "doctor" || args.profile === "review") {
        output = { results: results };
      } else {
        output = formatAsyncOutput(results);
      }
      break;
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
    formatSubagentStartOutput,
    formatSideEffectOutput,
    readState,
    writeState,
  };
}
