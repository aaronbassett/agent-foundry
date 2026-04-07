"use strict";

module.exports = async function securitySummary(input, state, config, cwd) {
  const lines = [];

  if (state.detectedPackageManager) {
    lines.push(
      `Package manager: ${state.detectedPackageManager}`
    );
  }

  const blocked = state.blocked || {};
  const ttlMs = (config.thresholds.blockThenWarnTTLHours || 8) * 3600 * 1000;
  const now = Date.now();
  const activeBlocks = [];

  for (const [category, entries] of Object.entries(blocked)) {
    for (const [key, timestamp] of Object.entries(entries)) {
      if (now - timestamp < ttlMs) {
        activeBlocks.push(
          `${category}: ${key === "_" ? "(global)" : key}`
        );
      }
    }
  }

  if (activeBlocks.length > 0) {
    lines.push(
      "Active block-then-warn entries (will warn instead of block):"
    );
    for (const b of activeBlocks) {
      lines.push(`  - ${b}`);
    }
  }

  if (lines.length === 0) {
    lines.push("No supply chain security context to preserve.");
  }

  return {
    status: "info",
    message: lines.join("\n"),
    details: {},
  };
};
