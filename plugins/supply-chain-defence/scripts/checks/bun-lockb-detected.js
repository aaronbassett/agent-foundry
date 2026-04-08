"use strict";

const fs = require("fs");
const path = require("path");

module.exports = async function bunLockbDetected(input, state, config, cwd) {
  if (!fs.existsSync(path.join(cwd, "bun.lockb"))) {
    return { status: "pass", message: "No bun.lockb found", details: {} };
  }

  const bunfigPath = path.join(cwd, "bunfig.toml");
  let hasSaveBinarySetting = false;
  if (fs.existsSync(bunfigPath)) {
    const content = fs.readFileSync(bunfigPath, "utf8");
    hasSaveBinarySetting = /saveBinaryLockfile\s*=\s*true/.test(content);
  }

  const preamble =
    "bun.lockb (binary lockfile) detected. This format is unsupported — " +
    "it was superseded by the text-based bun.lock format in Bun 1.2 (January 2025). " +
    "Migrate to bun.lock:";

  const suffix =
    "\nThe text format is reviewable in diffs, supported by Socket.dev, " +
    "and 30% faster for cached installs.";

  if (hasSaveBinarySetting) {
    return {
      status: "warn",
      message:
        preamble +
        "\n1. [ ] Remove the `saveBinaryLockfile` setting from bunfig.toml" +
        "\n2. [ ] Run `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`" +
        "\n3. [ ] Delete bun.lockb" +
        suffix,
      details: { hasSaveBinarySetting: true },
    };
  }

  return {
    status: "warn",
    message:
      preamble +
      "\n1. [ ] Run `bun install --save-text-lockfile --frozen-lockfile --lockfile-only`" +
      "\n2. [ ] Delete bun.lockb" +
      suffix,
    details: { hasSaveBinarySetting: false },
  };
};
