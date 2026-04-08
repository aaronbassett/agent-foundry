"use strict";

module.exports = async function bunGaps(input, state, config, cwd) {
  if (state.detectedPackageManager !== "bun") {
    return { status: "pass", message: "Not using bun", details: {} };
  }

  return {
    status: "info",
    message:
      "Bun detected — some supply chain checks have limited support:\n" +
      "- Lockfile integrity: lockfile-lint does not support bun.lock. Manually review bun.lock for unexpected registry URLs.\n" +
      "- Dependency tree: bun pm ls does not support --json output. Run `bun pm ls --all` and review visually.\n" +
      "- Provenance: npm audit signatures is npm-only. No bun equivalent exists — verify critical packages manually on npmjs.com.",
    details: {},
  };
};
