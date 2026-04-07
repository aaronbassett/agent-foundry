"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  shouldBlock,
  recordBlock,
  formatPreToolUseOutput,
  formatAlwaysBlockOutput,
  formatSessionStartOutput,
  formatAsyncOutput,
  formatContextOutput,
  readState,
  writeState,
} = require("../scripts/runner");

const config = require("../scripts/config.json");

function emptyState() {
  return { detectedPackageManager: null, lastDeepAudit: null, blocked: {} };
}

// --- shouldBlock ---

describe("shouldBlock", () => {
  it("returns true for always-block severity", () => {
    const state = emptyState();
    assert.strictEqual(shouldBlock("dep-direct-edit", "_", state, config), true);
  });

  it("returns false for report severity", () => {
    const state = emptyState();
    assert.strictEqual(shouldBlock("npmrc-hardened", "_", state, config), false);
  });

  it("returns true for block-then-warn on first encounter", () => {
    const state = emptyState();
    assert.strictEqual(shouldBlock("typosquat-local", "axois", state, config), true);
  });

  it("returns false for block-then-warn within TTL", () => {
    const state = emptyState();
    state.blocked = { "typosquat-local": { axois: Date.now() } };
    assert.strictEqual(shouldBlock("typosquat-local", "axois", state, config), false);
  });

  it("returns true for block-then-warn after TTL expires", () => {
    const state = emptyState();
    const nineHoursAgo = Date.now() - 9 * 3600 * 1000;
    state.blocked = { "typosquat-local": { axois: nineHoursAgo } };
    assert.strictEqual(shouldBlock("typosquat-local", "axois", state, config), true);
  });

  it("returns false for unknown check name", () => {
    const state = emptyState();
    assert.strictEqual(shouldBlock("nonexistent-check", "_", state, config), false);
  });

  it("uses _ as default key when checkKey is null", () => {
    const state = emptyState();
    state.blocked = { "socket-present": { _: Date.now() } };
    assert.strictEqual(shouldBlock("socket-present", null, state, config), false);
  });
});

// --- recordBlock ---

describe("recordBlock", () => {
  it("records a block with timestamp", () => {
    const state = emptyState();
    const before = Date.now();
    recordBlock("typosquat-local", "axois", state);
    const after = Date.now();
    assert.ok(state.blocked["typosquat-local"].axois >= before);
    assert.ok(state.blocked["typosquat-local"].axois <= after);
  });

  it("creates nested structure if missing", () => {
    const state = {};
    recordBlock("ci-over-install", null, state);
    assert.ok(state.blocked["ci-over-install"]["_"]);
  });

  it("preserves existing blocks in other categories", () => {
    const state = emptyState();
    state.blocked = { existing: { key: 12345 } };
    recordBlock("typosquat-local", "axois", state);
    assert.strictEqual(state.blocked.existing.key, 12345);
    assert.ok(state.blocked["typosquat-local"].axois);
  });
});

// --- readState / writeState ---

describe("readState / writeState", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-runner-test-"));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns default state when file does not exist", () => {
    const state = readState(tmpDir);
    assert.strictEqual(state.detectedPackageManager, null);
    assert.deepStrictEqual(state.blocked, {});
  });

  it("writes and reads back state", () => {
    const state = {
      detectedPackageManager: "pnpm",
      lastDeepAudit: Date.now(),
      blocked: { typosquat: { axois: Date.now() } },
    };
    writeState(tmpDir, state);
    const read = readState(tmpDir);
    assert.strictEqual(read.detectedPackageManager, "pnpm");
    assert.ok(read.blocked.typosquat.axois);
  });

  it("creates nested directories", () => {
    const nested = path.join(tmpDir, "sub", "dir");
    fs.mkdirSync(nested, { recursive: true });
    writeState(nested, emptyState());
    const statePath = path.join(
      nested,
      ".claude",
      "agent-foundry",
      "supply-chain-defence.local.json"
    );
    assert.ok(fs.existsSync(statePath));
  });
});

// --- formatPreToolUseOutput ---

describe("formatPreToolUseOutput", () => {
  it("denies when a check blocks and shouldBlock returns true", () => {
    const state = emptyState();
    const results = [
      { checkName: "typosquat-local", checkKey: "axois", status: "block", message: "Typosquat detected" },
    ];
    const output = formatPreToolUseOutput(results, state, config);
    assert.strictEqual(output.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(output.hookSpecificOutput.permissionDecisionReason.includes("Typosquat"));
    // Should have recorded the block
    assert.ok(state.blocked["typosquat-local"].axois);
  });

  it("allows with warnings when check blocks but within TTL", () => {
    const state = emptyState();
    state.blocked = { "typosquat-local": { axois: Date.now() } };
    const results = [
      { checkName: "typosquat-local", checkKey: "axois", status: "block", message: "Typosquat detected" },
    ];
    const output = formatPreToolUseOutput(results, state, config);
    assert.strictEqual(output.hookSpecificOutput.permissionDecision, "allow");
    assert.ok(output.hookSpecificOutput.additionalContext.includes("warnings"));
  });

  it("returns null when all checks pass", () => {
    const state = emptyState();
    const results = [
      { checkName: "ci-over-install", checkKey: null, status: "pass", message: "OK" },
    ];
    const output = formatPreToolUseOutput(results, state, config);
    assert.strictEqual(output, null);
  });
});

// --- formatAlwaysBlockOutput ---

describe("formatAlwaysBlockOutput", () => {
  it("denies on block status", () => {
    const results = [
      { checkName: "dep-direct-edit", status: "block", message: "Direct edit blocked" },
    ];
    const output = formatAlwaysBlockOutput(results);
    assert.strictEqual(output.hookSpecificOutput.permissionDecision, "deny");
  });

  it("returns null when all pass", () => {
    const results = [
      { checkName: "dep-direct-edit", status: "pass", message: "OK" },
    ];
    const output = formatAlwaysBlockOutput(results);
    assert.strictEqual(output, null);
  });
});

// --- formatSessionStartOutput ---

describe("formatSessionStartOutput", () => {
  it("includes additionalContext for all results", () => {
    const results = [
      { status: "pass", message: "PM detected: pnpm" },
      { status: "warn", message: "No .npmrc" },
    ];
    const output = formatSessionStartOutput(results);
    assert.ok(output.hookSpecificOutput.additionalContext.includes("pnpm"));
    assert.ok(output.hookSpecificOutput.additionalContext.includes(".npmrc"));
  });

  it("includes systemMessage when there are critical issues", () => {
    const results = [
      { status: "warn", message: "Socket missing" },
    ];
    const output = formatSessionStartOutput(results);
    assert.ok(output.systemMessage);
    assert.ok(output.systemMessage.includes("Socket"));
  });

  it("omits systemMessage when all pass", () => {
    const results = [
      { status: "pass", message: "All good" },
    ];
    const output = formatSessionStartOutput(results);
    assert.strictEqual(output.systemMessage, undefined);
  });
});

// --- formatAsyncOutput ---

describe("formatAsyncOutput", () => {
  it("returns systemMessage for issues", () => {
    const results = [
      { status: "warn", message: "3 vulnerabilities found" },
    ];
    const output = formatAsyncOutput(results);
    assert.ok(output.systemMessage.includes("vulnerabilities"));
  });

  it("returns null when all pass", () => {
    const results = [
      { status: "pass", message: "Clean" },
    ];
    const output = formatAsyncOutput(results);
    assert.strictEqual(output, null);
  });
});

// --- formatContextOutput ---

describe("formatContextOutput", () => {
  it("returns additionalContext from messages", () => {
    const results = [
      { status: "info", message: "Package manager: pnpm" },
    ];
    const output = formatContextOutput(results);
    assert.ok(output.hookSpecificOutput.additionalContext.includes("pnpm"));
  });

  it("returns null for empty messages", () => {
    const results = [
      { status: "info", message: "" },
    ];
    const output = formatContextOutput(results);
    // message is empty string which is falsy, so filtered out
    assert.strictEqual(output, null);
  });
});
