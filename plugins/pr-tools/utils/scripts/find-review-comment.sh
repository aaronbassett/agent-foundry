#!/usr/bin/env bash
#
# find-review-comment.sh
# Find the most recent Claude Code review comment on a GitHub PR
#
# Usage: find-review-comment.sh <repo> <pr-number>
#   repo: Repository in owner/repo format
#   pr-number: PR number
#
# Output (JSON):
#   {
#     "id": "comment-id",
#     "body": "comment body text",
#     "createdAt": "2026-02-12T10:30:00Z",
#     "author": "author-login"
#   }
#
# Exit codes:
#   0 - Comment found
#   1 - Invalid arguments
#   2 - No comments found on PR
#   3 - No Claude review comment found
#   4 - gh command failed

set -euo pipefail

MARKER="<!-- claude-pr-review -->"

# Check arguments
if [ $# -ne 2 ]; then
  echo "Usage: find-review-comment.sh <repo> <pr-number>" >&2
  echo "Example: find-review-comment.sh user/repo 123" >&2
  exit 1
fi

REPO="$1"
PR_NUM="$2"

# Validate PR number is numeric
if ! [[ "$PR_NUM" =~ ^[0-9]+$ ]]; then
  echo "Error: PR number must be numeric" >&2
  exit 1
fi

# Fetch all PR comments
COMMENTS=$(gh pr view "$PR_NUM" --repo "$REPO" --json comments 2>&1) || {
  echo "Error: Failed to fetch PR #$PR_NUM in $REPO" >&2
  echo "$COMMENTS" >&2
  exit 4
}

# Check if there are any comments
COMMENT_COUNT=$(echo "$COMMENTS" | jq -r '.comments | length')
if [ "$COMMENT_COUNT" = "0" ]; then
  echo "Error: No comments found on PR #$PR_NUM" >&2
  exit 2
fi

# Find the most recent comment with the Claude review marker
# Sort by createdAt descending and get the first match
REVIEW_COMMENT=$(echo "$COMMENTS" | jq -r --arg marker "$MARKER" '
  .comments
  | map(select(.body | contains($marker)))
  | sort_by(.createdAt)
  | reverse
  | .[0] // null
')

if [ "$REVIEW_COMMENT" = "null" ] || [ -z "$REVIEW_COMMENT" ]; then
  echo "Error: No Claude Code review comment found on PR #$PR_NUM" >&2
  echo "The comment must contain the marker: $MARKER" >&2
  echo "Run /pr-tools:review-pr first to create a review." >&2
  exit 3
fi

# Output the review comment as JSON
echo "$REVIEW_COMMENT" | jq '{
  id: .id,
  body: .body,
  createdAt: .createdAt,
  author: .author.login
}'

exit 0
