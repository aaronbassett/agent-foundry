---
name: pr-tools:address-review
description: This skill should be used when the user asks to "address the review", "discuss PR feedback", "plan fixes for the review", "create a plan to fix PR issues", or wants to brainstorm solutions for review findings. Use after a PR review has been posted to fetch the review comment and guide the user through creating an action plan using the brainstorming workflow.
argument-hint: "[--repo user/repo] --pr number"
---

# Address Review

Fetch the most recent Claude Code review comment on a PR and use the brainstorming skill to discuss and create a plan for addressing the identified issues.

## Your Task

When this skill is invoked, you should:

1. **Resolve the plugin root** using the utils:find-claude-plugin-root skill
2. **Validate GitHub CLI is ready** by running the github-cli-ready.sh script
3. **Parse arguments** using parse-pr-args.py to get repo and PR number
4. **Fetch PR metadata** using `gh pr view` to get title and URL
5. **Find the review comment** using find-review-comment.sh
6. **Extract key issues** by counting severity markers (🔴, 🟡, 🟢)
7. **If no issues found**, inform the user the PR looks good to merge and exit
8. **Otherwise, invoke the brainstorming skill** and present the review findings to start the discussion

## Dependencies

- **pr-tools:utils** - Uses utility scripts for GitHub CLI validation, PR argument parsing, and finding review comments
- **superpowers:brainstorming** - Invoked for interactive planning session

## Invocation Examples

- `/pr-tools:address-review` - Current branch PR
- `/pr-tools:address-review --pr 123` - Specific PR in current repo
- `/pr-tools:address-review --repo user/repo --pr 123` - Any repo PR

## Workflow Steps

### 1. Setup and Validation

First, get the plugin root and validate prerequisites:

- Invoke utils:find-claude-plugin-root skill
- Run `python3 /tmp/cpr.py pr-tools` to get PLUGIN_ROOT
- Set SCRIPTS="${PLUGIN_ROOT}/utils/scripts"
- Run "${SCRIPTS}/github-cli-ready.sh" to ensure gh CLI is authenticated

### 2. Parse Arguments

Run the parse-pr-args.py script with the user's arguments to get:
- Repository (owner/repo format)
- PR number

### 3. Fetch PR Information

Use `gh pr view "$PR_NUM" --repo "$REPO" --json number,title,state,url` to get:
- PR title
- PR URL
- Verify the PR exists

### 4. Find Review Comment

Run "${SCRIPTS}/find-review-comment.sh" "$REPO" "$PR_NUM" to:
- Find the most recent Claude Code review comment
- Get the comment body and creation date
- Save to /tmp/pr-${PR_NUM}-review.md for reference

### 5. Analyze Review Content

Parse the review comment to count issues by severity:
- Count lines matching "^### 🔴" for critical issues
- Count lines matching "^### 🟡" for important improvements
- Count lines matching "^### 🟢" for suggestions

If all counts are 0, the PR has no issues - inform the user and exit.

### 6. Invoke Brainstorming

If issues were found:
- Invoke the superpowers:brainstorming skill
- Present the review findings to the user with:
  - PR title and number
  - Issue counts by severity
  - Link to full review
  - Key findings from each section
  - Questions about which issues to address now vs. later
  - Discussion of implementation approaches

## Your Response Format

After completing the workflow, present findings to the user like:

```
I've found a Claude Code review for PR #{number}: "{title}"

Review Summary:
- 🔴 {count} critical issues
- 🟡 {count} important improvements
- 🟢 {count} suggestions

Full review: {url}

Let me share the key findings from the review:

[Extract and show main issues from each severity section]

Now, let's discuss:
1. Which of these issues should we address in this PR?
2. Are there any that should be deferred to future PRs or issues?
3. For the issues we'll address, what's the best implementation approach?
```

The brainstorming skill will then guide the user through creating an approved plan.

## Error Handling

If errors occur:
- **No PR found**: Inform user to check PR number and repository
- **No review comment found**: Inform user to run /review-pr first
- **GitHub CLI not authenticated**: Inform user to run `gh auth login`
- **Script failures**: Display the error output and suggest fixes

## Notes

- Save the review to /tmp for easy reference
- Let brainstorming handle the discussion and plan creation
- Don't try to auto-fix issues - get user input first
- The full workflow happens in the background - present clean results to the user at the end
