---
name: pr-tools:review-pr
description: This skill should be used when the user asks to "review this PR", "check the pull request", "review PR #123", "analyze this pull request", "get automated review", or wants code review for a GitHub PR. Launches parallel specialist agents for multi-language code review, security analysis, TODO detection, and SDD task verification, then posts consolidated findings as a PR comment.
argument-hint: "[--repo user/repo] --pr number [--dry-run]"
---

# PR Review

Orchestrate a comprehensive pull request review by launching multiple specialist agents in parallel.

## Your Task

When this skill is invoked, you should:

1. **Validate prerequisites** and parse arguments (including --dry-run flag)
2. **Fetch PR metadata** to understand what changed
3. **Launch pr-validator agent** to check reviewability and detect languages/SDD
4. **Launch parallel review agents** based on detected languages and patterns
5. **Launch pr-commenter agent** to consolidate findings and post/update PR comment
6. **Present results** to the user with a summary

## Dependencies

- **pr-tools:utils** - Uses utility scripts for GitHub CLI validation and PR argument parsing
- **devs plugin** - Provides language-specific review skills (python-core, typescript-core, rust-core, react-core)

## Invocation Examples

- `/pr-tools:review-pr` - Current branch PR
- `/pr-tools:review-pr --pr 123` - Specific PR in current repo
- `/pr-tools:review-pr --repo user/repo --pr 123` - Any repo PR
- `/pr-tools:review-pr --dry-run` - Save to /tmp instead of posting
- `/pr-tools:review-pr --pr 123 --dry-run` - Dry run for specific PR

## Workflow Steps

### 1. Setup and Validation

- Invoke utils:find-claude-plugin-root skill
- Run `python3 /tmp/cpr.py pr-tools` to get PLUGIN_ROOT
- Set SCRIPTS="${PLUGIN_ROOT}/utils/scripts"
- Run "${SCRIPTS}/github-cli-ready.sh" to ensure gh CLI is authenticated
- Extract --dry-run flag from arguments if present
- Run parse-pr-args.py with remaining arguments to get repo and PR number

### 2. Fetch PR Metadata

Use `gh pr view "$PR_NUM" --repo "$REPO" --json number,title,state,isDraft,author,body,files,additions,deletions` to get:
- PR state (open/closed/merged)
- Draft status
- Title
- Changed files
- Line additions/deletions

### 3. Launch pr-validator Agent

Launch the pr-tools:pr-validator agent with the PR data to:
- Check if PR is draft, closed, or trivial (skip if yes)
- Detect programming languages from changed file extensions
- Detect if SDD is in use (specs/**/tasks.md modified)
- Return JSON with reviewable status, languages array, sddDetected boolean

If PR is not reviewable:
- Explain why (draft/closed/trivial/etc)
- If not dry-run, post an explanatory comment
- Exit gracefully

### 4. Launch Parallel Review Agents

Using a **SINGLE Task tool call with multiple invocations**, launch all these agents in parallel:

**For each detected language:**
- Agent: pr-tools:code-reviewer
- Model: Opus
- Task: Review PR for {language} code using /devs:{language}-core skill
- Pass: PR diff, PR context, language name

**TODO Finder:**
- Agent: pr-tools:todo-finder
- Model: Haiku
- Task: Find TODO/FIXME/HACK/XXX/NOTE/BUG comments in added lines
- Pass: PR diff

**SDD Task Verifier (conditional):**
- Agent: pr-tools:sdd-task-verifier
- Model: Opus
- Task: Verify checked SDD tasks; deep review for P1 tasks
- Pass: PR diff, tasks.md content
- Only launch if sddDetected is true

Wait for all agents to complete and collect their outputs.

### 5. Handle Partial Failures

If some agents fail or timeout:
- Continue with available results
- Mark failed reviews clearly in the output
- Include partial results where possible

### 6. Launch pr-commenter Agent

Launch the pr-tools:pr-commenter agent with:
- All agent outputs (code reviews, TODOs, SDD verification)
- PR number and repository
- Dry run flag
- Agent success/failure status

The agent will:
- Merge all findings
- Deduplicate similar issues
- Organize by severity (critical → important → suggestions)
- Format the report with proper markdown
- Check for existing Claude Code review comment
- Update existing comment or create new one
- Post comment (or save to /tmp/pr-review-{PR_NUM}.md if dry-run)

### 7. Present Results to User

After all agents complete, present a clean summary:

**If dry-run:**
```
Review complete. Saved to /tmp/pr-review-{number}.md

Summary:
- {count} critical issues
- {count} important improvements
- {count} suggestions
[if SDD detected: - {verified}/{total} P1 tasks verified]
```

**If posted:**
```
Review posted successfully.

View PR: https://github.com/{repo}/pull/{number}

Summary:
- {count} critical issues
- {count} important improvements
- {count} suggestions
[if SDD detected: - {verified}/{total} P1 tasks verified]
```

## Error Handling

Handle these common errors gracefully:

- **PR Not Found**: Inform user to check PR number and repository
- **Permission Denied**: Inform user to run `gh auth login`
- **Rate Limiting**: Save review to /tmp and inform user to wait
- **Agent Timeout**: Continue with partial results and note what failed

## Implementation Notes

- Use `gh pr view` with --json for structured data (easier to parse)
- Use `gh pr diff` to get diff content for agents
- Use `gh api` for finding existing comments
- Always sanitize inputs before passing to gh CLI
- Launch ALL review agents in a single parallel Task call for maximum performance
- Don't echo progress during execution - present clean results at the end
- The user doesn't need to know about intermediate steps unless there are errors

## Agent Parallelism Example

When launching agents, use a single Task tool call with multiple invocations:

```xml
<invoke name="Task">
  <parameter name="subagent_type">pr-tools:code-reviewer</parameter>
  <parameter name="description">Review Python code</parameter>
  <parameter name="prompt">Review PR #123 in user/repo for Python code...</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">pr-tools:code-reviewer</parameter>
  <parameter name="description">Review TypeScript code</parameter>
  <parameter name="prompt">Review PR #123 in user/repo for TypeScript code...</parameter>
</invoke>
<invoke name="Task">
  <parameter name="subagent_type">pr-tools:todo-finder</parameter>
  <parameter name="description">Find TODO comments</parameter>
  <parameter name="prompt">Find TODOs in PR #123...</parameter>
</invoke>
```

This ensures all agents run concurrently for optimal performance.
