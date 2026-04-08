#!/bin/bash
set -euo pipefail

# sync.sh — The ONLY script that uses CLAUDE_PLUGIN_ROOT.
# Generates VERSION from plugin.json, then copies scripts/ to CLAUDE_PLUGIN_DATA if version mismatch.

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
SOURCE_DIR="${PLUGIN_ROOT}/scripts"
TARGET_DIR="${CLAUDE_PLUGIN_DATA}/scripts"

# Generate VERSION from plugin.json (canonical source)
PLUGIN_JSON="${PLUGIN_ROOT}/.claude-plugin/plugin.json"
if [[ ! -f "${PLUGIN_JSON}" ]]; then
  echo "ERROR: ${PLUGIN_JSON} not found" >&2
  exit 0  # Non-blocking — don't break session start
fi
VERSION=$(node -p "require('${PLUGIN_JSON}').version")
echo "${VERSION}" > "${SOURCE_DIR}/VERSION"

# Read target version (may not exist yet)
TARGET_VERSION=""
if [[ -f "${TARGET_DIR}/VERSION" ]]; then
  TARGET_VERSION=$(cat "${TARGET_DIR}/VERSION")
fi

# Compare and sync if needed
if [[ "${VERSION}" != "${TARGET_VERSION}" ]]; then
  mkdir -p "${TARGET_DIR}"
  # Remove old scripts to avoid stale files
  rm -rf "${TARGET_DIR:?}/"*
  cp -R "${SOURCE_DIR}/"* "${TARGET_DIR}/"
fi

exit 0
