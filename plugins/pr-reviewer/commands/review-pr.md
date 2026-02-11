---
name: review-pr
description: Launch parallel specialist agents to review a GitHub pull request and post consolidated findings as a comment
argument-hint: "[user/repo] [pr-number] [--dry-run]"
allowed-tools:
  - Bash
  - Task
  - Read
  - Write
---

# PR Review Command

Orchestrate a comprehensive pull request review by launching multiple specialist agents in parallel.

## Invocation Modes

Parse arguments to determine which PR to review:

**Mode A: Current Branch PR**
```bash
/review-pr
```
Find and review the PR for the current branch.

**Mode B: Specific PR in Current Repo**
```bash
/review-pr 123
```
Review PR #123 in the current repository.

**Mode C: Any Repo PR**
```bash
/review-pr user/repo 123
```
Review PR #42 in the specified repository.

**Dry Run Mode**
```bash
/review-pr --dry-run
/review-pr 123 --dry-run
/review-pr user/repo 123 --dry-run
```
Perform review but save to `/tmp/pr-review-{PR_NUMBER}.md` instead of posting.

## Implementation Steps

### Step 1: Prerequisites Check

Before processing, verify prerequisites:

```bash
# Check gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed."
  echo "Install: brew install gh"
  echo "Visit: https://cli.github.com/"
  exit 1
fi

# Check gh CLI is authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub CLI is not authenticated."
  echo "Run: gh auth login"
  exit 1
fi
```

### Step 2: Parse Arguments

Parse $ARGUMENTS to determine mode and flags:

```bash
ARGS="$*"
DRY_RUN=false

# Check for --dry-run flag
if echo "$ARGS" | grep -q "\--dry-run"; then
  DRY_RUN=true
  ARGS=$(echo "$ARGS" | sed 's/--dry-run//g' | xargs)
fi

# Parse mode
if [ -z "$ARGS" ]; then
  # Mode A: Current branch PR
  PR_NUM=$(gh pr view --json number -q .number 2>/dev/null)
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

  if [ -z "$PR_NUM" ]; then
    echo "❌ No PR found for current branch."
    echo "Create a PR first or specify PR number."
    exit 1
  fi

elif [[ "$ARGS" =~ ^[0-9]+$ ]]; then
  # Mode B: PR number only
  PR_NUM="$ARGS"
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

  if [ -z "$REPO" ]; then
    echo "❌ Not in a git repository."
    exit 1
  fi

else
  # Mode C: user/repo PR_NUM
  REPO=$(echo "$ARGS" | awk '{print $1}')
  PR_NUM=$(echo "$ARGS" | awk '{print $2}')

  if [ -z "$REPO" ] || [ -z "$PR_NUM" ]; then
    echo "❌ Invalid arguments."
    echo "Usage: /review-pr [user/repo] [pr-number] [--dry-run]"
    exit 1
  fi
fi

echo "📋 Reviewing PR #$PR_NUM in $REPO"
if [ "$DRY_RUN" = true ]; then
  echo "🔍 Dry run mode - will not post comment"
fi
```

### Step 3: Fetch PR Metadata

Fetch PR information using gh CLI:

```bash
# Fetch PR details
PR_DATA=$(gh pr view "$PR_NUM" --repo "$REPO" --json \
  number,title,state,isDraft,author,body,files,additions,deletions 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Could not fetch PR #$PR_NUM"
  echo "$PR_DATA"
  exit 1
fi

# Extract key fields
STATE=$(echo "$PR_DATA" | jq -r '.state')
IS_DRAFT=$(echo "$PR_DATA" | jq -r '.isDraft')
TITLE=$(echo "$PR_DATA" | jq -r '.title')

echo "PR: $TITLE"
echo "State: $STATE | Draft: $IS_DRAFT"
```

### Step 4: Launch pr-validator Agent

Launch the validation agent to check if PR is reviewable:

```bash
echo ""
echo "🔍 Step 1/4: Validating PR..."
```

Use the Task tool to launch the `pr-validator` agent with this prompt:

```
Validate PR #$PR_NUM in $REPO for reviewability.

PR Data:
$PR_DATA

Tasks:
1. Check if PR is draft, closed, or trivial (skip if yes)
2. Detect languages from changed file extensions
3. Detect if SDD is in use (specs/**/tasks.md modified)
4. Return JSON with reviewable status, languages, sddDetected, and metadata
```

**If validation returns `reviewable: false`**, post an explanatory comment (if not dry-run) and exit gracefully:

```bash
# Example: PR is draft
gh pr comment "$PR_NUM" --repo "$REPO" --body "Skipping review: PR is in draft status. Mark as ready for review to trigger automated review."
exit 0
```

**If validation succeeds**, extract the results:
- `languages`: Array of detected languages (e.g., ["python", "typescript"])
- `sddDetected`: Boolean indicating if SDD tasks.md was modified
- Continue to parallel reviews

### Step 5: Launch Parallel Reviews

Launch all review agents in parallel using a SINGLE Task tool call with multiple invocations:

```bash
echo "✅ Validation complete"
echo ""
echo "🔍 Step 2/4: Running parallel reviews..."
echo "   - Code reviewers: ${#languages[@]} languages"
echo "   - TODO finder"
if [ "$SDD_DETECTED" = true ]; then
  echo "   - SDD task verifier"
fi
```

**Launch these agents in parallel:**

1. **code-reviewer agents** (one per detected language):
   - Prompt: `Review PR #$PR_NUM in $REPO for {language} code. Use the /devs:{language}-core skill.`
   - Model: Opus
   - Pass: PR diff, PR context

2. **todo-finder agent**:
   - Prompt: `Find TODO/FIXME/HACK/XXX/NOTE/BUG comments in added lines of PR #$PR_NUM in $REPO. Return structured JSON.`
   - Model: Haiku

3. **sdd-task-verifier agent** (conditional - only if sddDetected):
   - Prompt: `Verify checked SDD tasks in PR #$PR_NUM in $REPO. For P1 tasks, do deep implementation review. For other tasks, verify file exists and has changes.`
   - Model: Opus

Wait for all agents to complete and collect their outputs.

**Progress updates**: Show which agents have completed:
```bash
echo "   ✓ Python review complete"
echo "   ✓ TypeScript review complete"
echo "   ✓ TODO finder complete"
```

### Step 6: Handle Partial Failures

If some agents fail or timeout, continue with available results:

```bash
if [ "$PYTHON_REVIEW_FAILED" = true ]; then
  echo "   ⚠️  Python review failed (including partial results)"
fi
```

Mark failed reviews clearly in the final output.

### Step 7: Launch pr-commenter Agent

Consolidate all findings and post/update PR comment:

```bash
echo "✅ Reviews complete"
echo ""
echo "🔍 Step 3/4: Consolidating findings..."
```

Launch the `pr-commenter` agent with:
- All agent outputs (code reviews, TODOs, SDD verification)
- PR number and repo
- Dry run flag
- Agent success/failure status

The agent will:
1. Merge all findings
2. Deduplicate similar issues
3. Organize by severity (critical → important → suggestions)
4. Format the report
5. Determine comment strategy (create new or update existing)
6. Post comment (or save to file if dry-run)

### Step 8: Display Results

Show summary to the user:

```bash
echo "✅ Consolidation complete"
echo ""
echo "🔍 Step 4/4: Posting results..."

if [ "$DRY_RUN" = true ]; then
  echo "✅ Review saved to: /tmp/pr-review-$PR_NUM.md"
  echo ""
  echo "📝 Summary:"
  echo "   - $CRITICAL_COUNT critical issues"
  echo "   - $IMPORTANT_COUNT important improvements"
  echo "   - $SUGGESTION_COUNT suggestions"
  if [ "$SDD_DETECTED" = true ]; then
    echo "   - $P1_VERIFIED/$P1_TOTAL P1 tasks verified"
  fi
else
  echo "✅ Comment posted successfully"
  echo "🔗 View PR: https://github.com/$REPO/pull/$PR_NUM"
  echo ""
  echo "📝 Summary:"
  # Same summary as dry-run
fi
```

## Error Handling

Handle common errors gracefully:

**PR Not Found**
```bash
echo "❌ Could not find PR #$PR_NUM in $REPO"
echo "Check the PR number and repository are correct."
exit 1
```

**Permission Denied**
```bash
echo "❌ Permission denied posting comment"
echo "Ensure gh CLI is authenticated with repo access."
echo "Run: gh auth login"
exit 1
```

**Rate Limiting**
```bash
echo "❌ GitHub API rate limit exceeded"
echo "Wait a few minutes and try again."
echo "Review saved to: /tmp/pr-review-$PR_NUM.md"
exit 1
```

**Agent Timeout**
```bash
echo "⚠️  Warning: {agent-name} timed out"
echo "Continuing with partial results..."
# Include partial results in final report
```

## Tips for Implementation

- Use `gh pr view` to fetch PR metadata as JSON (easier to parse)
- Use `gh pr diff` to get the diff content for agents
- Use `gh api` for advanced operations (finding existing comments)
- Always sanitize inputs before passing to gh CLI (use `--` separator)
- Show progress updates so users know the review is in progress
- Be explicit about what failed vs. what succeeded
- Provide actionable error messages with next steps

## Example Task Tool Usage

Launch all agents in a single Tool call for maximum parallelism:

```xml
<invoke name="Task">
  <parameter name="subagent_type">code-reviewer</parameter>
  <parameter name="description">Review Python code</parameter>
  <parameter name="prompt">Review PR #123 in user/repo for Python code...</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">code-reviewer</parameter>
  <parameter name="description">Review TypeScript code</parameter>
  <parameter name="prompt">Review PR #123 in user/repo for TypeScript code...</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">todo-finder</parameter>
  <parameter name="description">Find TODO comments</parameter>
  <parameter name="prompt">Find TODOs in PR #123...</parameter>
</invoke>
```

This ensures all agents run concurrently for optimal performance.
