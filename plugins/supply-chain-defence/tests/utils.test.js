"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { extractPackageNames, npmView } = require("../scripts/utils");

describe("extractPackageNames", () => {
  it("extracts simple package names", () => {
    const result = extractPackageNames("npm install lodash express");
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, "lodash");
    assert.strictEqual(result[1].name, "express");
  });

  it("extracts package with version specifier", () => {
    const result = extractPackageNames("npm install lodash@4.17.21");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "lodash");
    assert.strictEqual(result[0].full, "lodash@4.17.21");
  });

  it("extracts scoped package", () => {
    const result = extractPackageNames("npm install @babel/core");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "@babel/core");
    assert.strictEqual(result[0].full, "@babel/core");
  });

  it("extracts scoped package with version", () => {
    const result = extractPackageNames("npm install @babel/core@7.24.0");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "@babel/core");
    assert.strictEqual(result[0].full, "@babel/core@7.24.0");
  });

  it("skips flags", () => {
    const result = extractPackageNames("npm install -D --save-exact lodash");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "lodash");
  });

  it("handles pnpm add", () => {
    const result = extractPackageNames("pnpm add express");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "express");
  });

  it("handles yarn add", () => {
    const result = extractPackageNames("yarn add react react-dom");
    assert.strictEqual(result.length, 2);
  });

  it("returns empty for non-install commands", () => {
    const result = extractPackageNames("npm test");
    assert.strictEqual(result.length, 0);
  });

  it("returns empty for bare install (no packages)", () => {
    const result = extractPackageNames("npm install");
    assert.strictEqual(result.length, 0);
  });

  it("handles version ranges", () => {
    const result = extractPackageNames("npm install lodash@^4.0.0");
    assert.strictEqual(result[0].name, "lodash");
    assert.strictEqual(result[0].full, "lodash@^4.0.0");
  });

  it("does not treat shell metacharacters as special", () => {
    // This tests the extraction — injection prevention is in npmView
    const result = extractPackageNames("npm install evil;rm -rf /");
    // Should extract "evil;rm" as package name (it's just a string)
    assert.ok(result.length >= 1);
  });
});

describe("npmView", () => {
  it("does not execute shell metacharacters in package names", () => {
    // This package doesn't exist, so npmView returns ok: false
    // But critically, it must NOT execute the shell command
    const result = npmView("nonexistent; echo INJECTED", ["--json"], "/tmp", 5000);
    assert.strictEqual(result.ok, false);
    // The error should be from npm not finding the package, not from shell execution
    // If shell injection worked, we'd get ok: true with unexpected output
  });

  it("handles scoped packages safely", () => {
    const result = npmView("@nonexistent/pkg", ["--json"], "/tmp", 5000);
    assert.strictEqual(result.ok, false);
  });

  it("handles backtick injection attempt", () => {
    const result = npmView("`echo INJECTED`", ["--json"], "/tmp", 5000);
    assert.strictEqual(result.ok, false);
  });

  it("handles $() injection attempt", () => {
    const result = npmView("$(echo INJECTED)", ["--json"], "/tmp", 5000);
    assert.strictEqual(result.ok, false);
  });

  it("handles pipe injection attempt", () => {
    const result = npmView("pkg | cat /etc/passwd", ["--json"], "/tmp", 5000);
    assert.strictEqual(result.ok, false);
  });
});

describe("extractNpxPackage", () => {
  const npxAuditModule = require("../scripts/checks/npx-audit");
  const extractNpxPackage = npxAuditModule.extractNpxPackage;

  // Skip if not exported
  if (!extractNpxPackage) return;

  it("extracts simple package from npx command", () => {
    const result = extractNpxPackage("npx create-react-app my-app");
    assert.strictEqual(result.name, "create-react-app");
  });

  it("extracts scoped package", () => {
    const result = extractNpxPackage("npx @babel/cli src");
    assert.strictEqual(result.name, "@babel/cli");
  });

  it("extracts scoped package with version", () => {
    const result = extractNpxPackage("npx @babel/cli@7.24.0 src");
    assert.strictEqual(result.name, "@babel/cli");
    assert.strictEqual(result.full, "@babel/cli@7.24.0");
  });

  it("skips -y flag", () => {
    const result = extractNpxPackage("npx -y create-next-app");
    assert.strictEqual(result.name, "create-next-app");
  });

  it("skips --yes flag", () => {
    const result = extractNpxPackage("npx --yes create-next-app");
    assert.strictEqual(result.name, "create-next-app");
  });

  it("returns null for bare npx", () => {
    const result = extractNpxPackage("npx");
    assert.strictEqual(result, null);
  });
});
