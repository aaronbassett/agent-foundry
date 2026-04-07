#!/bin/bash
set -euo pipefail

# sync.sh — The ONLY script that uses CLAUDE_PLUGIN_ROOT.
# Copies scripts/ from plugin root to CLAUDE_PLUGIN_DATA if version mismatch.

SOURCE_DIR="${CLAUDE_PLUGIN_ROOT}/scripts"
TARGET_DIR="${CLAUDE_PLUGIN_DATA}/scripts"

# Read source version
if [[ ! -f "${SOURCE_DIR}/VERSION" ]]; then
  echo "ERROR: ${SOURCE_DIR}/VERSION not found" >&2
  exit 0  # Non-blocking — don't break session start
fi
SOURCE_VERSION=$(cat "${SOURCE_DIR}/VERSION")

# Read target version (may not exist yet)
TARGET_VERSION=""
if [[ -f "${TARGET_DIR}/VERSION" ]]; then
  TARGET_VERSION=$(cat "${TARGET_DIR}/VERSION")
fi

# Compare and sync if needed
if [[ "${SOURCE_VERSION}" != "${TARGET_VERSION}" ]]; then
  mkdir -p "${TARGET_DIR}"
  # Remove old scripts to avoid stale files
  rm -rf "${TARGET_DIR:?}/"*
  cp -R "${SOURCE_DIR}/"* "${TARGET_DIR}/"
fi

exit 0
