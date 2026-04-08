"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const config = require("../scripts/config.json");

function emptyState() {
  return { detectedPackageManager: null, lastDeepAudit: null, blocked: {} };
}

// ---------------------------------------------------------------------------
// 1. ci-over-install
// ---------------------------------------------------------------------------
describe("ci-over-install", () => {
  const check = require("../scripts/checks/ci-over-install");

  it("blocks bare npm install", async () => {
    const result = await check(
      { tool_input: { command: "npm install" } },
      { detectedPackageManager: "npm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
    assert.ok(result.message.includes("npm ci"));
  });

  it("blocks bare pnpm install", async () => {
    const result = await check(
      { tool_input: { command: "pnpm install" } },
      { detectedPackageManager: "pnpm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
    assert.ok(result.message.includes("--frozen-lockfile"));
  });

  it("passes npm ci", async () => {
    const result = await check(
      { tool_input: { command: "npm ci" } },
      { detectedPackageManager: "npm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("passes when adding a specific package", async () => {
    const result = await check(
      { tool_input: { command: "npm install lodash" } },
      { detectedPackageManager: "npm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("passes pnpm install --frozen-lockfile", async () => {
    const result = await check(
      { tool_input: { command: "pnpm install --frozen-lockfile" } },
      { detectedPackageManager: "pnpm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("blocks bare yarn (no arguments)", async () => {
    const result = await check(
      { tool_input: { command: "yarn" } },
      { detectedPackageManager: "yarn" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });

  it("blocks npm i (short alias)", async () => {
    const result = await check(
      { tool_input: { command: "npm i" } },
      { detectedPackageManager: "npm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });
});

// ---------------------------------------------------------------------------
// 2. before-flag
// ---------------------------------------------------------------------------
describe("before-flag", () => {
  const check = require("../scripts/checks/before-flag");

  it("passes for non-install commands", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check(
        { tool_input: { command: "npm test" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes for npm ci (not adding a package)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check(
        { tool_input: { command: "npm ci" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // --- Case 3: Neither setting nor --before ---

  it("blocks when no setting and no --before flag", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check(
        { tool_input: { command: "npm install lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("No release age protection configured"));
      // Should include instructions for all PMs
      assert.ok(result.message.includes("min-release-age"));
      assert.ok(result.message.includes("minimumReleaseAge"));
      assert.ok(result.message.includes("npmMinimumReleaseAge"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("shows detected PM instructions first when state has detectedPackageManager", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const state = emptyState();
    state.detectedPackageManager = "pnpm";
    try {
      const result = await check(
        { tool_input: { command: "pnpm add lodash" } },
        state,
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("This project uses pnpm"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // --- Case 2: No setting, --before flag ---

  it("passes when --before date is >= 5 days ago", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];
    try {
      const result = await check(
        { tool_input: { command: `npm install lodash --before ${tenDaysAgo}` } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks when --before date is < 5 days ago", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const yesterday = new Date(Date.now() - 1 * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];
    try {
      const result = await check(
        { tool_input: { command: `npm install lodash --before ${yesterday}` } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("below the recommended minimum"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles --before=DATE format (equals sign)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];
    try {
      const result = await check(
        { tool_input: { command: `npm install lodash --before=${tenDaysAgo}` } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // --- Case 1: Setting present ---

  it("passes when min-release-age >= 5 in .npmrc", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".npmrc"), "min-release-age=7\n");
    try {
      const result = await check(
        { tool_input: { command: "npm install lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
      assert.ok(result.message.includes("7 days"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks when min-release-age < 5 in .npmrc", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".npmrc"), "min-release-age=2\n");
    try {
      const result = await check(
        { tool_input: { command: "npm install lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("2 days"));
      assert.ok(result.message.includes("below the recommended minimum"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when pnpm minimumReleaseAge >= 5 days in pnpm-workspace.yaml", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    // 7200 minutes = 5 days
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "minimumReleaseAge: 7200\n");
    try {
      const result = await check(
        { tool_input: { command: "pnpm add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks when pnpm minimumReleaseAge < 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    // 1440 minutes = 1 day
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "minimumReleaseAge: 1440\n");
    try {
      const result = await check(
        { tool_input: { command: "pnpm add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("below the recommended minimum"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("prefers .npmrc over pnpm-workspace.yaml when both exist", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".npmrc"), "min-release-age=10\n");
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "minimumReleaseAge: 1440\n");
    try {
      const result = await check(
        { tool_input: { command: "npm install lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
      assert.ok(result.message.includes("10 days"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // --- Yarn support ---

  it("passes when yarn npmMinimumReleaseAge >= 5 days (duration string)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "npmMinimumReleaseAge: 7d\n");
    try {
      const result = await check(
        { tool_input: { command: "yarn add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when yarn npmMinimumReleaseAge >= 5 days (minutes)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "npmMinimumReleaseAge: 7200\n");
    try {
      const result = await check(
        { tool_input: { command: "yarn add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks when yarn npmMinimumReleaseAge < 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "npmMinimumReleaseAge: 1d\n");
    try {
      const result = await check(
        { tool_input: { command: "yarn add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
      assert.ok(result.message.includes("below the recommended minimum"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles yarn duration string with weeks", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "npmMinimumReleaseAge: 1w\n");
    try {
      const result = await check(
        { tool_input: { command: "yarn add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass"); // 1 week = 7 days >= 5
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles yarn duration string with hours", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "npmMinimumReleaseAge: 168h\n");
    try {
      const result = await check(
        { tool_input: { command: "yarn add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass"); // 168h = 7 days >= 5
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles quoted yarn duration string", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), 'npmMinimumReleaseAge: "7d"\n');
    try {
      const result = await check(
        { tool_input: { command: "yarn add lodash" } },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 2b. before-flag: buildConfigInstructions
// ---------------------------------------------------------------------------
describe("buildConfigInstructions", () => {
  const { buildConfigInstructions } = require("../scripts/checks/before-flag");

  it("puts detected PM first when known", () => {
    const result = buildConfigInstructions(5, "pnpm");
    assert.ok(result.startsWith("This project uses pnpm"));
    assert.ok(result.includes("minimumReleaseAge: 7200"));
    // Should also include others
    assert.ok(result.includes("min-release-age"));
    assert.ok(result.includes("npmMinimumReleaseAge"));
  });

  it("puts npm first when detected", () => {
    const result = buildConfigInstructions(5, "npm");
    assert.ok(result.startsWith("This project uses npm"));
    assert.ok(result.includes("min-release-age=5"));
  });

  it("puts yarn first when detected", () => {
    const result = buildConfigInstructions(5, "yarn");
    assert.ok(result.startsWith("This project uses yarn"));
    assert.ok(result.includes('npmMinimumReleaseAge: "5d"'));
  });

  it("lists all PMs when none detected", () => {
    const result = buildConfigInstructions(5, null);
    assert.ok(result.startsWith("To configure for your package manager:"));
    assert.ok(result.includes("min-release-age=5"));
    assert.ok(result.includes("minimumReleaseAge: 7200"));
    assert.ok(result.includes('npmMinimumReleaseAge: "5d"'));
  });

  it("uses correct day-to-minute conversion", () => {
    const result = buildConfigInstructions(7, "pnpm");
    assert.ok(result.includes("minimumReleaseAge: 10080")); // 7 * 1440
  });
});

// ---------------------------------------------------------------------------
// 3. dep-direct-edit (Edit path)
// ---------------------------------------------------------------------------
describe("dep-direct-edit", () => {
  const check = require("../scripts/checks/dep-direct-edit");

  it("blocks Edit touching dependencies", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/package.json",
          old_string: '"dependencies": { "lodash": "^4.17.21" }',
          new_string: '"dependencies": { "lodash": "^4.18.0" }',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });

  it("blocks Edit touching devDependencies", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/package.json",
          old_string: '"devDependencies": {}',
          new_string: '"devDependencies": { "jest": "^29.0.0" }',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });

  it("allows Edit touching scripts", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/package.json",
          old_string: '"scripts": { "test": "jest" }',
          new_string: '"scripts": { "test": "vitest" }',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("allows Edit touching name/description", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/package.json",
          old_string: '"name": "old-name"',
          new_string: '"name": "new-name"',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("blocks Edit touching overrides", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/package.json",
          old_string: '"overrides": {}',
          new_string: '"overrides": { "foo": "1.0.0" }',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });
});

// ---------------------------------------------------------------------------
// 4. dep-direct-edit (Write path) — needs temp directory
// ---------------------------------------------------------------------------
describe("dep-direct-edit (Write)", () => {
  const check = require("../scripts/checks/dep-direct-edit");
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test",
        version: "1.0.0",
        dependencies: { lodash: "^4.17.21" },
        scripts: { test: "jest" },
      })
    );
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("blocks Write that changes dependencies", async () => {
    const result = await check(
      {
        tool_name: "Write",
        tool_input: {
          file_path: path.join(tmpDir, "package.json"),
          content: JSON.stringify({
            name: "test",
            version: "1.0.0",
            dependencies: { express: "^4.18.0" },
            scripts: { test: "jest" },
          }),
        },
      },
      emptyState(),
      config,
      tmpDir
    );
    assert.strictEqual(result.status, "block");
    assert.ok(result.details.changedFields.includes("dependencies"));
  });

  it("allows Write that only changes scripts", async () => {
    const result = await check(
      {
        tool_name: "Write",
        tool_input: {
          file_path: path.join(tmpDir, "package.json"),
          content: JSON.stringify({
            name: "test",
            version: "1.0.0",
            dependencies: { lodash: "^4.17.21" },
            scripts: { test: "vitest" },
          }),
        },
      },
      emptyState(),
      config,
      tmpDir
    );
    assert.strictEqual(result.status, "pass");
  });
});

// ---------------------------------------------------------------------------
// 5. typosquat-local
// ---------------------------------------------------------------------------
describe("typosquat-local", () => {
  const check = require("../scripts/checks/typosquat-local");

  it("blocks a typosquatted package name", async () => {
    const result = await check(
      { tool_input: { command: "npm install axois" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
    assert.ok(result.message.includes("axios"));
  });

  it("passes for a real package name", async () => {
    const result = await check(
      { tool_input: { command: "npm install axios" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("passes for an unknown package not similar to any popular one", async () => {
    const result = await check(
      { tool_input: { command: "npm install my-very-unique-internal-package" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("passes when no package names in command", async () => {
    const result = await check(
      { tool_input: { command: "npm test" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });

  it("detects typosquat of chalk", async () => {
    const result = await check(
      { tool_input: { command: "npm install chalkk" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
    assert.ok(result.message.includes("chalk"));
  });
});

// ---------------------------------------------------------------------------
// 6. package-manager — needs temp directories
// ---------------------------------------------------------------------------
describe("package-manager", () => {
  const check = require("../scripts/checks/package-manager");

  it("detects pnpm from pnpm-lock.yaml", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    try {
      const state = emptyState();
      const result = await check({}, state, config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.strictEqual(result.details.pm, "pnpm");
      assert.strictEqual(state.detectedPackageManager, "pnpm");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects npm from package-lock.json", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
    try {
      const state = emptyState();
      const result = await check({}, state, config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.strictEqual(result.details.pm, "npm");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("defaults to pnpm when only package.json exists", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.strictEqual(result.details.pm, "pnpm");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns info when no package.json", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "info");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("prefers pnpm when both lockfiles exist", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.details.pm, "pnpm");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects bun from bun.lock", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lock"), "{}");
    try {
      const state = emptyState();
      const result = await check({}, state, config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.strictEqual(result.details.pm, "bun");
      assert.strictEqual(state.detectedPackageManager, "bun");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects bun from bun.lockb (fallback)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    try {
      const state = emptyState();
      const result = await check({}, state, config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.strictEqual(result.details.pm, "bun");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 7. lockfile-present — needs temp directories
// ---------------------------------------------------------------------------
describe("lockfile-present", () => {
  const check = require("../scripts/checks/lockfile-present");

  it("passes when lockfile exists", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "package-lock.json"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns when package.json but no lockfile", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns info when no package.json", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "info");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects bun.lock", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lock"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
      assert.ok(result.message.includes("bun.lock"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 8. npmrc-hardened — needs temp directories
// ---------------------------------------------------------------------------
describe("npmrc-hardened", () => {
  const check = require("../scripts/checks/npmrc-hardened");

  it("warns when no .npmrc", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("No .npmrc"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes with fully hardened .npmrc", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, ".npmrc"),
      [
        "ignore-scripts=true",
        "package-lock=true",
        "registry=https://registry.npmjs.org/",
        "strict-ssl=true",
        "npx-auto-install=false",
        "save-exact=true",
        "audit-level=low",
        "min-release-age=5",
      ].join("\n")
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns with partial .npmrc", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, ".npmrc"),
      "ignore-scripts=true\nstrict-ssl=true\n"
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("Missing"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns when ignore-scripts is false", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, ".npmrc"),
      [
        "ignore-scripts=false",
        "package-lock=true",
        "registry=https://registry.npmjs.org/",
        "strict-ssl=true",
        "npx-auto-install=false",
        "save-exact=true",
        "audit-level=low",
        "min-release-age=5",
      ].join("\n")
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("Incorrect"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 9. security-summary
// ---------------------------------------------------------------------------
describe("security-summary", () => {
  const check = require("../scripts/checks/security-summary");

  it("reports no context when state is empty", async () => {
    const result = await check({}, emptyState(), config, "/tmp");
    assert.strictEqual(result.status, "info");
    assert.ok(result.message.includes("No supply chain"));
  });

  it("includes detected package manager", async () => {
    const state = emptyState();
    state.detectedPackageManager = "pnpm";
    const result = await check({}, state, config, "/tmp");
    assert.ok(result.message.includes("pnpm"));
  });

  it("includes active blocks", async () => {
    const state = emptyState();
    state.blocked = {
      typosquat: { axois: Date.now() },
    };
    const result = await check({}, state, config, "/tmp");
    assert.ok(result.message.includes("axois"));
  });

  it("excludes expired blocks", async () => {
    const state = emptyState();
    state.blocked = {
      typosquat: { axois: Date.now() - 9 * 3600 * 1000 }, // 9 hours ago, TTL is 8
    };
    const result = await check({}, state, config, "/tmp");
    assert.ok(!result.message.includes("axois"));
  });
});

// ---------------------------------------------------------------------------
// 10. typosquat-bulk — needs temp directory
// ---------------------------------------------------------------------------
describe("typosquat-bulk", () => {
  const check = require("../scripts/checks/typosquat-bulk");

  it("warns on typosquatted dependency", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { axois: "^1.0.0" } })
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("axois"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes with legitimate dependencies", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { axios: "^1.0.0", debug: "^4.0.0" } })
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns info when no package.json", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "info");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 11. before-flag-config
// ---------------------------------------------------------------------------
describe("before-flag-config", () => {
  const check = require("../scripts/checks/before-flag-config");

  it("warns when no config files exist", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("No release age gating"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when .npmrc has min-release-age >= 5", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".npmrc"), "min-release-age=7\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns when .npmrc has min-release-age < 5", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".npmrc"), "min-release-age=2\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("below"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when pnpm-workspace.yaml has minimumReleaseAge >= 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "pnpm-workspace.yaml"), "minimumReleaseAge: 7200\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when .yarnrc.yml has npmMinimumReleaseAge >= 5 days", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, ".yarnrc.yml"), "npmMinimumReleaseAge: 7d\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 12. dep-direct-edit (file path check)
// ---------------------------------------------------------------------------
describe("dep-direct-edit (file path check)", () => {
  const check = require("../scripts/checks/dep-direct-edit");

  it("allows Edit to non-package.json files even with dependency-like content", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/README.md",
          old_string: '"dependencies": { "lodash": "^4.17.21" }',
          new_string: '"dependencies": { "lodash": "^4.18.0" }',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
    assert.ok(result.message.includes("Not editing package.json"));
  });

  it("blocks Edit to package.json in a subdirectory", async () => {
    const result = await check(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: "/project/packages/api/package.json",
          old_string: '"dependencies": {}',
          new_string: '"dependencies": { "express": "^4.18.0" }',
        },
      },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });
});

// ---------------------------------------------------------------------------
// 13. sbom-freshness
// ---------------------------------------------------------------------------
describe("sbom-freshness", () => {
  const check = require("../scripts/checks/sbom-freshness");

  it("returns info when no SBOM file exists", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "info");
      assert.ok(result.message.includes("No SBOM"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when sbom.json is fresh", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "sbom.json"), "{}");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns when sbom.json is stale (>30 days)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const sbomPath = path.join(tmpDir, "sbom.json");
    fs.writeFileSync(sbomPath, "{}");
    // Set mtime to 60 days ago
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000);
    fs.utimesSync(sbomPath, sixtyDaysAgo, sixtyDaysAgo);
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("days old"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 14. typosquat-local (scope substitution)
// ---------------------------------------------------------------------------
describe("typosquat-local (scope substitution)", () => {
  const check = require("../scripts/checks/typosquat-local");

  it("detects scope-substitution attack", async () => {
    // @babel/code-frame is in the popular list, @attacker/code-frame should be flagged
    const result = await check(
      { tool_input: { command: "npm install @attacker/code-frame" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
    assert.ok(result.message.includes("scope substitution"));
  });

  it("passes for the actual popular scoped package", async () => {
    const result = await check(
      { tool_input: { command: "npm install @babel/code-frame" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "pass");
  });
});

describe("typosquat-bulk (scope substitution)", () => {
  const check = require("../scripts/checks/typosquat-bulk");

  it("detects scope-substitution in existing deps", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { "@attacker/core": "^1.0.0" } })
    );
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("scope substitution") || result.message.includes("@attacker/core"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 15. scripts-synced
// ---------------------------------------------------------------------------
describe("scripts-synced", () => {
  const check = require("../scripts/checks/scripts-synced");

  it("returns info when CLAUDE_PLUGIN_DATA not set", async () => {
    const origEnv = process.env.CLAUDE_PLUGIN_DATA;
    delete process.env.CLAUDE_PLUGIN_DATA;
    try {
      const result = await check({}, emptyState(), config, "/tmp");
      assert.strictEqual(result.status, "info");
    } finally {
      if (origEnv !== undefined) process.env.CLAUDE_PLUGIN_DATA = origEnv;
    }
  });

  it("warns when VERSION file missing from CLAUDE_PLUGIN_DATA", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const origEnv = process.env.CLAUDE_PLUGIN_DATA;
    process.env.CLAUDE_PLUGIN_DATA = tmpDir;
    try {
      const result = await check({}, emptyState(), config, "/tmp");
      assert.strictEqual(result.status, "warn");
    } finally {
      process.env.CLAUDE_PLUGIN_DATA = origEnv;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("passes when VERSION file exists", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "scripts", "VERSION"), "0.1.1");
    const origEnv = process.env.CLAUDE_PLUGIN_DATA;
    process.env.CLAUDE_PLUGIN_DATA = tmpDir;
    try {
      const result = await check({}, emptyState(), config, "/tmp");
      assert.strictEqual(result.status, "pass");
      assert.ok(result.message.includes("0.1.1"));
    } finally {
      process.env.CLAUDE_PLUGIN_DATA = origEnv;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 16. ci-over-install (case insensitivity)
// ---------------------------------------------------------------------------
describe("ci-over-install (case insensitivity)", () => {
  const check = require("../scripts/checks/ci-over-install");

  it("blocks NPM install (uppercase)", async () => {
    const result = await check(
      { tool_input: { command: "NPM install" } },
      { detectedPackageManager: "npm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });

  it("blocks Npm Install (mixed case)", async () => {
    const result = await check(
      { tool_input: { command: "Npm Install" } },
      { detectedPackageManager: "npm" },
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
  });
});

// ---------------------------------------------------------------------------
// 17. typosquat-local: combined Levenshtein + scope-substitution
// ---------------------------------------------------------------------------
describe("typosquat-local (combined attacks)", () => {
  const check = require("../scripts/checks/typosquat-local");

  it("detects both Levenshtein typosquat and scope-substitution in same command", async () => {
    // axois triggers Levenshtein, @attacker/code-frame triggers scope-substitution
    const result = await check(
      { tool_input: { command: "npm install axois @attacker/code-frame" } },
      emptyState(),
      config,
      "/tmp"
    );
    assert.strictEqual(result.status, "block");
    // Should flag both, not just the first
    assert.ok(result.details.suspects.length >= 2);
  });
});

// ---------------------------------------------------------------------------
// 18. dep-direct-edit Write path: file_path guard
// ---------------------------------------------------------------------------
describe("dep-direct-edit (Write file path)", () => {
  const check = require("../scripts/checks/dep-direct-edit");

  it("allows Write to non-package.json files even with dependency-like content", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const configFile = path.join(tmpDir, "config.json");
    fs.writeFileSync(configFile, JSON.stringify({ dependencies: { foo: "1.0.0" } }));
    try {
      const result = await check(
        {
          tool_name: "Write",
          tool_input: {
            file_path: configFile,
            content: JSON.stringify({ dependencies: { bar: "2.0.0" } }),
          },
        },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "pass");
      assert.ok(result.message.includes("Not writing package.json"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("blocks Write to package.json that changes dependencies", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    const pkgFile = path.join(tmpDir, "package.json");
    fs.writeFileSync(pkgFile, JSON.stringify({ dependencies: { lodash: "^4.17.21" } }));
    try {
      const result = await check(
        {
          tool_name: "Write",
          tool_input: {
            file_path: pkgFile,
            content: JSON.stringify({ dependencies: { express: "^4.18.0" } }),
          },
        },
        emptyState(),
        config,
        tmpDir
      );
      assert.strictEqual(result.status, "block");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// bun-lockb-detected
// ---------------------------------------------------------------------------
describe("bun-lockb-detected", () => {
  const check = require("../scripts/checks/bun-lockb-detected");

  it("passes when no bun.lockb exists", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "pass");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns when bun.lockb exists without bunfig setting", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("unsupported"));
      assert.ok(result.message.includes("Bun 1.2 (January 2025)"));
      assert.ok(result.message.includes("--save-text-lockfile"));
      assert.ok(result.message.includes("Delete bun.lockb"));
      assert.ok(!result.message.includes("Remove the"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("warns with bunfig removal step when saveBinaryLockfile is set", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    fs.writeFileSync(path.join(tmpDir, "bunfig.toml"), "[install]\nsaveBinaryLockfile = true\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(result.message.includes("saveBinaryLockfile"));
      assert.ok(result.message.includes("Remove the"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not warn when saveBinaryLockfile is false", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scd-test-"));
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    fs.writeFileSync(path.join(tmpDir, "bunfig.toml"), "[install]\nsaveBinaryLockfile = false\n");
    try {
      const result = await check({}, emptyState(), config, tmpDir);
      assert.strictEqual(result.status, "warn");
      assert.ok(!result.message.includes("Remove the"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// bun-gaps
// ---------------------------------------------------------------------------
describe("bun-gaps", () => {
  const check = require("../scripts/checks/bun-gaps");

  it("returns info with guidance when bun is detected", async () => {
    const state = emptyState();
    state.detectedPackageManager = "bun";
    const result = await check({}, state, config, "/tmp");
    assert.strictEqual(result.status, "info");
    assert.ok(result.message.includes("Bun detected"));
    assert.ok(result.message.includes("lockfile-lint"));
    assert.ok(result.message.includes("bun pm ls"));
    assert.ok(result.message.includes("npm audit signatures"));
  });

  it("passes silently when PM is not bun", async () => {
    const state = emptyState();
    state.detectedPackageManager = "npm";
    const result = await check({}, state, config, "/tmp");
    assert.strictEqual(result.status, "pass");
  });

  it("passes silently when no PM detected", async () => {
    const result = await check({}, emptyState(), config, "/tmp");
    assert.strictEqual(result.status, "pass");
  });
});
