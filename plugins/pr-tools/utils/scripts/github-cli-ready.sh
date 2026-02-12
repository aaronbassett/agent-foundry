#!/usr/bin/env bash
#
# github-cli-ready.sh
# Check if GitHub CLI (gh) is installed and authenticated
#
# Usage: github-cli-ready.sh
# Exit codes:
#   0 - gh is installed and authenticated
#   1 - gh is not installed
#   2 - gh is not authenticated

set -euo pipefail

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed." >&2
  echo "Install: brew install gh" >&2
  echo "Visit: https://cli.github.com/" >&2
  exit 1
fi

# Check if gh CLI is authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub CLI is not authenticated." >&2
  echo "Run: gh auth login" >&2
  exit 2
fi

echo "✅ GitHub CLI is ready"
exit 0
