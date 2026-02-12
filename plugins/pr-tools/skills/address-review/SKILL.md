---
name: pr-tools:address-review
description: This skill should be used when the user asks to "address the review", "discuss PR feedback", "plan fixes for the review", "create a plan to fix PR issues", or wants to brainstorm solutions for review findings. Use after a PR review has been posted to fetch the review comment and guide the user through creating an action plan using the brainstorming workflow.
argument-hint: "[--repo user/repo] --pr number"
---

# Address Review

Fetch the most recent Claude Code review comment on a PR and use the brainstorming skill to discuss and create a plan for addressing the identified issues.

## Purpose

Use this skill to:
1. Retrieve the latest Claude Code review comment from a GitHub PR
2. Extract and summarize review findings by severity
3. Launch an interactive brainstorming session with the user
4. Create a detailed, user-approved action plan for addressing issues
5. Integrate with SDD workflow if applicable

## Dependencies

- **pr-tools:utils** - Uses utility scripts for GitHub CLI validation, PR argument parsing, and finding review comments
- **superpowers:brainstorming** - Invoked for interactive planning session

## Invocation Modes

Flexible argument styles to specify which PR's review to address:

**Mode A: Current Branch PR**
```bash
/pr-tools:address-review
```
Find and address the review for the PR of the current branch.

**Mode B: Specific PR in Current Repo**
```bash
/pr-tools:address-review --pr 123
```
Address review for PR #123 in the current repository.

**Mode C: Any Repo PR**
```bash
/pr-tools:address-review --repo user/repo --pr 123
```
Address review for PR #123 in the specified repository.

## Implementation Steps

### Step 1: Validate Prerequisites and Parse Arguments

Use pr-tools utility scripts:

```bash
# Resolve plugin root
Skill(skill="utils:find-claude-plugin-root")
PLUGIN_ROOT=$(python3 /tmp/cpr.py pr-tools)
SCRIPTS="${PLUGIN_ROOT}/utils/scripts"

# Check GitHub CLI is ready
"${SCRIPTS}/github-cli-ready.sh" || exit $?

# Parse PR arguments
PR_DATA=$("${SCRIPTS}/parse-pr-args.py" "$@") || exit $?
REPO=$(echo "$PR_DATA" | jq -r '.repo')
PR_NUM=$(echo "$PR_DATA" | jq -r '.pr_number')

echo "📋 Fetching review for PR #$PR_NUM in $REPO"
```

### Step 2: Fetch PR Metadata

Fetch PR information to display context:

```bash
# Fetch PR details
PR_META=$(gh pr view "$PR_NUM" --repo "$REPO" --json number,title,state,url 2>&1) || {
  echo "❌ Could not fetch PR #$PR_NUM"
  echo "$PR_META"
  exit 1
}

TITLE=$(echo "$PR_META" | jq -r '.title')
PR_URL=$(echo "$PR_META" | jq -r '.url')

echo "PR: $TITLE"
echo "URL: $PR_URL"
echo ""
```

### Step 3: Find Review Comment

Use the find-review-comment.sh utility:

```bash
echo "🔍 Looking for Claude Code review comment..."

# Find the most recent Claude review comment
REVIEW=$("${SCRIPTS}/find-review-comment.sh" "$REPO" "$PR_NUM") || exit $?

COMMENT_BODY=$(echo "$REVIEW" | jq -r '.body')
COMMENT_DATE=$(echo "$REVIEW" | jq -r '.createdAt')

echo "✅ Found review comment from $COMMENT_DATE"

# Save to file for reference
REVIEW_FILE="/tmp/pr-${PR_NUM}-review.md"
echo "$COMMENT_BODY" > "$REVIEW_FILE"
echo "📝 Review saved to: $REVIEW_FILE"
echo ""
```

### Step 4: Extract Key Issues Summary

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

### Step 5: Invoke Brainstorming Skill

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
