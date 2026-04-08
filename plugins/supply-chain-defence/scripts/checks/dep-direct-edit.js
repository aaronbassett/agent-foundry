"use strict";

const fs = require("fs");
const path = require("path");

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "overrides",
];

const DEP_PATTERNS = DEP_FIELDS.map(
  (f) => new RegExp(`"${f}"\\s*:`)
);

module.exports = async function depDirectEdit(input, state, config, cwd) {
  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};

  if (toolName === "Edit") {
    const filePath = toolInput.file_path || "";
    if (!filePath.endsWith("package.json")) {
      return {
        status: "pass",
        message: "Not editing package.json",
        details: {},
      };
    }
    const oldStr = toolInput.old_string || "";
    const newStr = toolInput.new_string || "";
    const combined = oldStr + "\n" + newStr;

    const touchesDeps = DEP_PATTERNS.some((p) => p.test(combined));
    if (!touchesDeps) {
      return {
        status: "pass",
        message: "Edit does not touch dependency fields",
        details: {},
      };
    }

    return {
      status: "block",
      message:
        "Direct edits to dependency fields in package.json are not allowed. " +
        "Use the package manager instead:\n" +
        "  - Add: `pnpm add <package>` (or npm/yarn equivalent)\n" +
        "  - Remove: `pnpm remove <package>`\n" +
        "  - Update: `pnpm update <package>`\n\n" +
        "This ensures the lockfile stays in sync and integrity hashes are updated.",
      details: {},
    };
  }

  if (toolName === "Write") {
    const filePath = toolInput.file_path || "";
    const newContent = toolInput.content || "";

    let currentContent = "{}";
    try {
      currentContent = fs.readFileSync(filePath, "utf8");
    } catch {
      return {
        status: "pass",
        message: "New file creation — no existing deps to compare",
        details: {},
      };
    }

    let currentPkg, newPkg;
    try {
      currentPkg = JSON.parse(currentContent);
      newPkg = JSON.parse(newContent);
    } catch {
      return {
        status: "pass",
        message: "Could not parse package.json — skipping check",
        details: {},
      };
    }

    const changed = [];
    for (const field of DEP_FIELDS) {
      const currentVal = JSON.stringify(currentPkg[field] || {});
      const newVal = JSON.stringify(newPkg[field] || {});
      if (currentVal !== newVal) {
        changed.push(field);
      }
    }

    if (changed.length === 0) {
      return {
        status: "pass",
        message: "Write does not change dependency fields",
        details: {},
      };
    }

    return {
      status: "block",
      message:
        `Direct writes to package.json that change ${changed.join(", ")} are not allowed. ` +
        "Use the package manager to modify dependencies so the lockfile stays in sync.",
      details: { changedFields: changed },
    };
  }

  return { status: "pass", message: "Not an Edit or Write", details: {} };
};
