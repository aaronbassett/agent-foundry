---
name: address-review
description: Fetch the most recent PR review comment and discuss a plan for addressing issues using brainstorming
argument-hint: "[user/repo] [pr-number]"
allowed-tools:
  - Bash
  - Read
  - Skill
---

# Address Review Command

Fetch the most recent Claude Code review comment on a PR and use the brainstorming skill to discuss and create a plan for addressing the identified issues.

## Invocation Modes

Parse arguments to determine which PR's review to address:

**Mode A: Current Branch PR**
```bash
/address-review
```
Find and address the review for the PR of the current branch.

**Mode B: Specific PR in Current Repo**
```bash
/address-review 123
```
Address review for PR #123 in the current repository.

**Mode C: Any Repo PR**
```bash
/address-review user/repo 123
```
Address review for PR #123 in the specified repository.

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

Parse $ARGUMENTS to determine mode:

```bash
ARGS="$*"

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
    echo "Usage: /address-review [user/repo] [pr-number]"
    exit 1
  fi
fi

echo "📋 Fetching review for PR #$PR_NUM in $REPO"
```

### Step 3: Fetch PR Metadata

Fetch PR information to display context:

```bash
# Fetch PR details
PR_DATA=$(gh pr view "$PR_NUM" --repo "$REPO" --json \
  number,title,state,url 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Could not fetch PR #$PR_NUM"
  echo "$PR_DATA"
  exit 1
fi

TITLE=$(echo "$PR_DATA" | jq -r '.title')
PR_URL=$(echo "$PR_DATA" | jq -r '.url')

echo "PR: $TITLE"
echo "URL: $PR_URL"
echo ""
```

### Step 4: Find the Most Recent Claude Review Comment

Use gh CLI to fetch all PR comments and find the most recent one with the Claude review marker:

```bash
echo "🔍 Looking for Claude Code review comment..."

# Fetch all PR comments
COMMENTS=$(gh pr view "$PR_NUM" --repo "$REPO" --json comments -q '.comments[] | {id: .id, body: .body, createdAt: .createdAt, author: .author.login}' --jq '.')

if [ -z "$COMMENTS" ]; then
  echo "❌ No comments found on this PR."
  echo "Run /review-pr first to create a review."
  exit 1
fi

# Find the most recent comment with the Claude review marker
# The marker is: <!-- claude-code-review -->
REVIEW_COMMENT=$(echo "$COMMENTS" | jq -rs '
  map(select(.body | contains("<!-- claude-code-review -->")))
  | sort_by(.createdAt)
  | reverse
  | .[0]
')

if [ "$REVIEW_COMMENT" = "null" ] || [ -z "$REVIEW_COMMENT" ]; then
  echo "❌ No Claude Code review comment found on this PR."
  echo "Run /review-pr first to create a review."
  exit 1
fi

COMMENT_BODY=$(echo "$REVIEW_COMMENT" | jq -r '.body')
COMMENT_DATE=$(echo "$REVIEW_COMMENT" | jq -r '.createdAt')

echo "✅ Found review comment from $COMMENT_DATE"
echo ""
```

### Step 5: Save Review Comment to Temporary File

Save the review comment to a file for easier reference during brainstorming:

```bash
REVIEW_FILE="/tmp/pr-${PR_NUM}-review.md"
echo "$COMMENT_BODY" > "$REVIEW_FILE"

echo "📝 Review saved to: $REVIEW_FILE"
echo ""
```

### Step 6: Extract Key Issues Summary

Parse the review comment to extract and summarize the key issues:

```bash
# Count issues by severity
CRITICAL_COUNT=$(echo "$COMMENT_BODY" | grep -c "^### 🔴" || echo "0")
IMPORTANT_COUNT=$(echo "$COMMENT_BODY" | grep -c "^### 🟡" || echo "0")
SUGGESTION_COUNT=$(echo "$COMMENT_BODY" | grep -c "^### 🟢" || echo "0")

echo "📊 Review Summary:"
echo "   🔴 $CRITICAL_COUNT critical issues"
echo "   🟡 $IMPORTANT_COUNT important improvements"
echo "   🟢 $SUGGESTION_COUNT suggestions"
echo ""

if [ "$CRITICAL_COUNT" = "0" ] && [ "$IMPORTANT_COUNT" = "0" ] && [ "$SUGGESTION_COUNT" = "0" ]; then
  echo "✨ No issues found in the review!"
  echo "This PR looks good to merge."
  exit 0
fi
```

### Step 7: Invoke Brainstorming Skill

Now invoke the brainstorming skill to discuss the review findings with the user and create a plan.

**Before invoking brainstorming**, inform the user:

```
🎯 Starting brainstorming session to discuss review findings and create a plan.

We'll discuss:
- Which issues to address in this PR vs. future work
- Implementation approach for critical and important items
- Create a detailed, approved plan for addressing the findings

Review details saved to: $REVIEW_FILE
```

**Then invoke the skill:**

Use the Skill tool:
- skill: "superpowers:brainstorming"
- args: (none needed)

After invoking, present the context to the user as the opening of the brainstorming session:

```
I've found a Claude Code review for PR #$PR_NUM: "$TITLE"

Review Summary:
- 🔴 $CRITICAL_COUNT critical issues
- 🟡 $IMPORTANT_COUNT important improvements
- 🟢 $SUGGESTION_COUNT suggestions

Full review: $PR_URL

Let me share the key findings from the review:

[Extract and show the main issues from each section of the review]

Now, let's discuss:
1. Which of these issues should we address in this PR?
2. Are there any that should be deferred to future PRs or issues?
3. For the issues we'll address, what's the best implementation approach?
```

The brainstorming skill will then:
1. Explore requirements and priorities with the user
2. Discuss implementation approaches for each issue
3. Ask clarifying questions about scope and approach
4. Help create a detailed plan
5. Get user approval on the plan

At the end, the user will have a written plan (potentially in specs/plan.md if using SDD, or in a tasks list) that's ready for implementation.

## Output Format

After brainstorming completes, the user will have:
- A clear understanding of the review findings
- A prioritized list of issues to address
- A plan (potentially in specs/plan.md if using SDD) for addressing them
- User sign-off to proceed with implementation

## Tips for Implementation

- Use `gh pr view` with `--json comments` to fetch all comments
- Filter comments by the `<!-- claude-code-review -->` marker
- Sort by `createdAt` descending to get the most recent
- Save the review to `/tmp` for easy reference
- Pass the full review context to brainstorming
- Let brainstorming handle the discussion and plan creation
- Don't try to auto-fix issues - get user input first

## Error Handling

**No PR Found**
```bash
echo "❌ Could not find PR #$PR_NUM in $REPO"
echo "Check the PR number and repository are correct."
exit 1
```

**No Review Comment Found**
```bash
echo "❌ No Claude Code review comment found on this PR."
echo "Run /review-pr first to create a review."
exit 1
```

**No Issues in Review**
```bash
echo "✨ No issues found in the review!"
echo "This PR looks good to merge."
exit 0
```

## Example Usage Flow

1. User runs `/review-pr` to get a review
2. Review is posted with findings
3. User runs `/address-review`
4. Command fetches the review comment
5. Brainstorming skill is invoked with the review context
6. User discusses and creates plan
7. User implements the plan
8. User runs `/review-pr` again to verify fixes
