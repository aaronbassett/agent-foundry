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
      assert.ok(result.message.includes("min-release-age"));
      assert.ok(result.message.includes("min-release-age"));
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
