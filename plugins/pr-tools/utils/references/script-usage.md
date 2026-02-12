# PR Tools Utility Scripts Reference

Detailed documentation for utility scripts used across pr-tools skills.

## github-cli-ready.sh

Validates that GitHub CLI (gh) is installed and authenticated.

### Usage

```bash
github-cli-ready.sh
```

### Exit Codes

- `0` - gh is installed and authenticated (ready to use)
- `1` - gh is not installed
- `2` - gh is not authenticated

### Example

```bash
#!/usr/bin/env bash
if github-cli-ready.sh; then
  echo "GitHub CLI is ready"
  # Proceed with gh commands
else
  exit_code=$?
  if [ $exit_code -eq 1 ]; then
    echo "Please install gh CLI"
  elif [ $exit_code -eq 2 ]; then
    echo "Please authenticate with: gh auth login"
  fi
  exit $exit_code
fi
```

### Error Messages

**Not installed:**
```
❌ GitHub CLI (gh) is not installed.
Install: brew install gh
Visit: https://cli.github.com/
```

**Not authenticated:**
```
❌ GitHub CLI is not authenticated.
Run: gh auth login
```

## parse-pr-args.py

Flexible PR argument parser supporting multiple invocation styles with explicit flags or positional arguments.

### Usage Modes

#### Mode 1: Current Branch PR
```bash
parse-pr-args.py
```
Automatically detects PR for current git branch.

#### Mode 2: Explicit PR Number
```bash
parse-pr-args.py 123
parse-pr-args.py --pr 123
```
Uses PR #123 in current repository.

#### Mode 3: Explicit Repository and PR
```bash
parse-pr-args.py user/repo 123
parse-pr-args.py --repo user/repo --pr 123
```
Uses PR #123 in specified repository.

### Output Format (JSON)

```json
{
  "repo": "user/repo",
  "pr_number": 123,
  "mode": "current_branch|explicit_pr|explicit_repo"
}
```

### Fields

- **repo**: Repository in `owner/repo` format
- **pr_number**: PR number as integer
- **mode**: How the PR was determined
  - `current_branch` - Inferred from current git branch
  - `explicit_pr` - PR number provided, repo inferred
  - `explicit_repo` - Both repo and PR provided explicitly

### Exit Codes

- `0` - Success
- `1` - Invalid arguments (e.g., non-numeric PR number)
- `2` - Could not determine PR or repo from context

### Example Integration

```bash
#!/usr/bin/env bash
# Parse PR arguments
PR_DATA=$(parse-pr-args.py "$@") || exit $?

# Extract fields using jq
REPO=$(echo "$PR_DATA" | jq -r '.repo')
PR_NUM=$(echo "$PR_DATA" | jq -r '.pr_number')
MODE=$(echo "$PR_DATA" | jq -r '.mode')

echo "Reviewing PR #$PR_NUM in $REPO (mode: $MODE)"

# Use in gh commands
gh pr view "$PR_NUM" --repo "$REPO"
```

### Error Messages

**Invalid PR number:**
```
Error: Invalid PR number 'abc'
```

**No PR for current branch:**
```
❌ No PR found for current branch.
Create a PR first or specify PR number with --pr or as argument.
```

**Not in git repository:**
```
❌ Not in a git repository.
Specify repository with --repo flag.
```

### Bash Integration Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

# Parse arguments with proper error handling
if ! PR_DATA=$(parse-pr-args.py "$@"); then
  # Script already printed error message
  exit $?
fi

REPO=$(echo "$PR_DATA" | jq -r '.repo')
PR_NUM=$(echo "$PR_DATA" | jq -r '.pr_number')

echo "📋 Processing PR #$PR_NUM in $REPO"
```

## find-review-comment.sh

Finds the most recent Claude Code review comment on a GitHub PR.

### Usage

```bash
find-review-comment.sh <repo> <pr-number>
```

### Arguments

- **repo**: Repository in `owner/repo` format
- **pr-number**: PR number (must be numeric)

### Output Format (JSON)

```json
{
  "id": "IC_kwDOABCDEF12345",
  "body": "<!-- claude-code-review -->\n# Code Review Summary\n...",
  "createdAt": "2026-02-12T10:30:00Z",
  "author": "github-username"
}
```

### Fields

- **id**: GitHub comment ID (use for updating)
- **body**: Full comment body text including marker
- **createdAt**: ISO 8601 timestamp
- **author**: GitHub username of comment author

### Exit Codes

- `0` - Comment found successfully
- `1` - Invalid arguments (wrong number or non-numeric PR)
- `2` - No comments found on PR
- `3` - No Claude review comment found (no marker)
- `4` - gh command failed (API error, network, permissions)

### Claude Review Marker

The script searches for comments containing:
```html
<!-- claude-code-review -->
```

This HTML comment is used as a marker to identify Claude Code review comments among all PR comments.

### Example Integration

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO="user/repo"
PR_NUM="123"

# Find the review comment
if ! REVIEW=$(find-review-comment.sh "$REPO" "$PR_NUM"); then
  exit_code=$?
  case $exit_code in
    2) echo "No comments on this PR yet" ;;
    3) echo "Run /pr-tools:review-pr first" ;;
    4) echo "GitHub API error" ;;
  esac
  exit $exit_code
fi

# Extract fields
COMMENT_ID=$(echo "$REVIEW" | jq -r '.id')
COMMENT_BODY=$(echo "$REVIEW" | jq -r '.body')
CREATED_AT=$(echo "$REVIEW" | jq -r '.createdAt')

echo "Found review from $CREATED_AT"
echo "Comment ID: $COMMENT_ID"

# Save to file for processing
echo "$COMMENT_BODY" > /tmp/pr-${PR_NUM}-review.md

# Count issues
CRITICAL=$(echo "$COMMENT_BODY" | grep -c "^### 🔴" || echo "0")
IMPORTANT=$(echo "$COMMENT_BODY" | grep -c "^### 🟡" || echo "0")
SUGGESTIONS=$(echo "$COMMENT_BODY" | grep -c "^### 🟢" || echo "0")

echo "Issues: $CRITICAL critical, $IMPORTANT important, $SUGGESTIONS suggestions"
```

### Error Messages

**Invalid arguments:**
```
Usage: find-review-comment.sh <repo> <pr-number>
Example: find-review-comment.sh user/repo 123
```

**No comments:**
```
Error: No comments found on PR #123
```

**No Claude review:**
```
Error: No Claude Code review comment found on PR #123
The comment must contain the marker: <!-- claude-code-review -->
Run /pr-tools:review-pr first to create a review.
```

**GitHub API error:**
```
Error: Failed to fetch PR #123 in user/repo
[gh CLI error message]
```

## Common Integration Patterns

### Complete Workflow Example

```bash
#!/usr/bin/env bash
set -euo pipefail

# Step 0: Resolve plugin root using CPR resolver
Skill(skill="utils:find-claude-plugin-root")
PLUGIN_ROOT=$(python3 /tmp/cpr.py pr-tools)
UTILS="${PLUGIN_ROOT}/skills/utils/scripts"

# Step 1: Validate GitHub CLI
"${UTILS}/github-cli-ready.sh" || exit $?

# Step 2: Parse PR arguments
PR_DATA=$("${UTILS}/parse-pr-args.py" "$@") || exit $?
REPO=$(echo "$PR_DATA" | jq -r '.repo')
PR_NUM=$(echo "$PR_DATA" | jq -r '.pr_number')

echo "📋 Processing PR #$PR_NUM in $REPO"

# Step 3: Find review comment
REVIEW=$("${UTILS}/find-review-comment.sh" "$REPO" "$PR_NUM") || exit $?
COMMENT_BODY=$(echo "$REVIEW" | jq -r '.body')

# Step 4: Process review
echo "$COMMENT_BODY" > "/tmp/pr-${PR_NUM}-review.md"
echo "✅ Review saved to /tmp/pr-${PR_NUM}-review.md"
```

### Error Handling Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

# Function to handle errors gracefully
handle_error() {
  local exit_code=$1
  local step=$2

  case $step in
    "gh-ready")
      [ $exit_code -eq 1 ] && echo "Install gh: brew install gh"
      [ $exit_code -eq 2 ] && echo "Authenticate: gh auth login"
      ;;
    "parse-args")
      echo "Check your arguments and try again"
      ;;
    "find-review")
      [ $exit_code -eq 3 ] && echo "Run /pr-tools:review-pr first"
      ;;
  esac

  exit $exit_code
}

# Validate dependencies
github-cli-ready.sh || handle_error $? "gh-ready"

# Parse arguments
PR_DATA=$(parse-pr-args.py "$@") || handle_error $? "parse-args"

# Continue with processing...
```

### Testing Scripts Locally

```bash
# Test github-cli-ready.sh
./github-cli-ready.sh
echo "Exit code: $?"

# Test parse-pr-args.py
./parse-pr-args.py 123 | jq
./parse-pr-args.py user/repo 456 | jq
./parse-pr-args.py --repo user/repo --pr 789 | jq

# Test find-review-comment.sh
./find-review-comment.sh user/repo 123 | jq
```

## Dependencies

All scripts require:
- **bash** (github-cli-ready.sh, find-review-comment.sh)
- **python3** (parse-pr-args.py)
- **gh** (GitHub CLI) - All scripts
- **jq** - For JSON processing in integration scripts

Check dependencies:
```bash
command -v bash python3 gh jq
```

## Script Locations

Scripts are located in the pr-tools plugin:
```
plugins/pr-tools/skills/utils/scripts/
├── github-cli-ready.sh
├── parse-pr-args.py
└── find-review-comment.sh
```

Access from other skills using the CPR (Claude Plugin Root) resolver:

```bash
# Step 1: Invoke CPR resolver to create /tmp/cpr.py
Skill(skill="utils:find-claude-plugin-root")

# Step 2: Resolve plugin root path
PLUGIN_ROOT=$(python3 /tmp/cpr.py pr-tools)
UTILS_DIR="${PLUGIN_ROOT}/skills/utils/scripts"

# Step 3: Use the scripts
"${UTILS_DIR}/github-cli-ready.sh"
"${UTILS_DIR}/parse-pr-args.py" "$@"
```

**Why use CPR resolver?**
- `${CLAUDE_PLUGIN_ROOT}` environment variable is unreliable
- CPR resolver (`/tmp/cpr.py`) provides accurate plugin paths
- Works consistently across different Claude Code configurations
- Used by official plugins (sdd, etc.)
