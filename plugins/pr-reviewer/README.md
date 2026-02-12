# PR Reviewer Plugin

Comprehensive PR review plugin that launches multiple specialist agents in parallel to perform deep code reviews, detect issues, verify SDD tasks, and post consolidated findings as PR comments.

## Features

- **Multi-language support**: Automatically detects languages (Python, TypeScript, JavaScript, React, Rust) and launches appropriate expert reviewers
- **Parallel execution**: All specialist agents run concurrently for optimal speed
- **SDD integration**: Verifies completed tasks in SDD workflow
- **Smart commenting**: Updates existing Claude comments or creates new ones based on conversation flow
- **Flexible invocation**: Review current PR, specific PR in repo, or any PR in any repo
- **TODO detection**: Finds TODO, FIXME, HACK, XXX, NOTE, and BUG comments in PR changes
- **Severity-based reporting**: Organizes findings by critical, important, and suggestions
- **Interactive fix planning**: `/address-review` command fetches review comments and launches brainstorming session to create user-approved plans for addressing issues

## Prerequisites

### Required

- **GitHub CLI (`gh`)**: Must be installed and authenticated
  ```bash
  # Install gh CLI
  brew install gh  # macOS
  # or visit https://cli.github.com/

  # Authenticate
  gh auth login
  ```

- **devs plugin**: Required for language-specific review skills (used by `/review-pr`)
  - Provides: `/devs:python-core`, `/devs:typescript-core`, `/devs:rust-core`, `/devs:react-core`, `/devs:security-core`

- **superpowers plugin**: Required for brainstorming workflow (used by `/address-review`)
  - Provides: `/superpowers:brainstorming`

### Optional

- **sdd plugin**: Enhances SDD task verification and plan creation with additional context

## Installation

```bash
# Install from marketplace (when published)
claude plugin install pr-reviewer

# Or use locally
claude --plugin-dir /path/to/pr-reviewer
```

## Usage

### Commands

#### `/review-pr` - Automated PR Review

```bash
# Review PR for current branch
/review-pr

# Review specific PR in current repo
/review-pr 123

# Review PR in any repo
/review-pr user/repo 123

# Dry run (save to file instead of posting)
/review-pr --dry-run
```

#### `/address-review` - Discuss and Plan Fixes

After receiving a review, use this command to brainstorm and create a plan for addressing the findings:

```bash
# Address review for current branch PR
/address-review

# Address review for specific PR in current repo
/address-review 123

# Address review for any repo PR
/address-review user/repo 123
```

This command:
1. Fetches the most recent Claude Code review comment
2. Extracts and summarizes the findings
3. Invokes the brainstorming skill to discuss with you
4. Helps create a detailed, user-approved plan for addressing issues

### Workflow: Review → Plan → Fix → Re-review

The plugin supports a complete workflow for addressing PR feedback:

1. **Get Review**: Run `/review-pr` to get automated feedback
2. **Plan Fixes**: Run `/address-review` to discuss and create a plan
3. **Implement**: Follow the plan to address the issues
4. **Verify**: Run `/review-pr` again to confirm fixes

Example workflow:
```bash
# Step 1: Get initial review
/review-pr

# Review is posted with findings (e.g., 2 critical, 3 important, 5 suggestions)

# Step 2: Discuss and plan
/address-review
# Brainstorming session starts, you discuss priorities and approach
# Create a plan for addressing the critical and important issues

# Step 3: Implement the plan
# Make changes to address the issues

# Step 4: Verify fixes
/review-pr
# Get a fresh review to confirm issues are resolved
```

### Command Modes (review-pr)

**Mode A: Current Branch PR**
```bash
/review-pr
```
Automatically finds and reviews the PR for your current branch.

**Mode B: Specific PR in Current Repo**
```bash
/review-pr 123
```
Reviews PR #123 in the current repository.

**Mode C: Any Repo PR**
```bash
/review-pr aaronbassett/marketplace 42
```
Reviews PR #42 in the specified repository.

### Command Flags

**Dry Run** (Preview without posting)
```bash
/review-pr --dry-run
```
Performs the full review but saves results to `/tmp/pr-review-{PR_NUMBER}.md` instead of posting to GitHub.

## Review Process

The plugin follows this workflow:

1. **Parse & Validate** (pr-validator agent)
   - Checks PR is open and reviewable
   - Detects languages in changed files
   - Detects SDD task changes
   - Skips draft, closed, or trivial PRs

2. **Parallel Reviews** (launched concurrently)
   - **Code reviewers**: One per language, using devs skills
   - **TODO finder**: Scans for TODO/FIXME/HACK patterns
   - **SDD verifier**: Verifies completed tasks (if detected)

3. **Consolidate & Post** (pr-commenter agent)
   - Merges all findings
   - Organizes by severity
   - Posts or updates PR comment

## Review Scope

### What Gets Reviewed

- **Code quality**: Logic errors, bugs, readability
- **Security**: Vulnerabilities, injection risks, data exposure
- **Architecture**: Design patterns, separation of concerns
- **Best practices**: Language idioms, conventions, error handling
- **Performance**: Inefficient algorithms, resource usage
- **TODOs**: Newly added TODO comments
- **SDD tasks**: P1 tasks (deep review), other tasks (checklist)

### What Gets Skipped

- Draft PRs
- Closed or merged PRs
- Trivial PRs (≤5 lines, single file)
- Lock files (package-lock.json, etc.)
- Generated code

## Language Detection

The plugin automatically detects and reviews these languages:

| Language | File Extensions | Devs Skill Used |
|----------|----------------|-----------------|
| Python | `.py` | `/devs:python-core` |
| TypeScript | `.ts` | `/devs:typescript-core` |
| JavaScript | `.js` | `/devs:typescript-core` |
| React | `.tsx`, `.jsx` | `/devs:react-core` |
| Rust | `.rs` | `/devs:rust-core` |

## Comment Format

Reviews are posted as GitHub PR comments with this structure:

```markdown
<!-- claude-code-review -->
# Code Review Summary

**Last reviewed:** 2026-02-11 14:30 UTC
**Reviewed by:** Claude Code (PR Review Plugin v0.1.0)

---

## 🔴 Critical Issues (Must Fix)

[Security vulnerabilities, blocking bugs]

---

## 🟡 Important Improvements

[Architecture, design, quality issues]

---

## 🟢 Suggestions

[Best practices, nice-to-haves]

---

## ✨ Highlights

[Well-written code, good practices]

---

## 📝 TODOs Found in PR

[TODO/FIXME/HACK comments]

---

## 📋 SDD Task Verification

[Task verification results, if applicable]

---

**Summary:** X critical, Y important, Z suggestions
```

### Comment Strategy

- **No Claude comment exists**: Creates new comment
- **Last comment is from Claude**: Updates that comment
- **Claude comment exists but not last**: Creates new comment (discussion has moved forward)

Comments are identified by the `<!-- claude-code-review -->` HTML marker.

## Configuration

Create `.claude/pr-reviewer.local.md` in your project for custom configuration:

```yaml
---
# PR Reviewer Configuration

# Validation rules
skip_patterns:
  - "*.lock"           # Skip package lock files
  - "vendor/**"        # Skip vendored code
  - "generated/**"     # Skip generated code

trivial_threshold: 5   # Lines to consider trivial

# Language detection
language_mappings:
  ".vue": "typescript" # Treat .vue as TypeScript

# Agent timeouts (seconds)
agent_timeouts:
  code_reviewer: 600   # 10 minutes per language
  sdd_task_verifier: 300
  default: 300

# Report customization
report_sections:
  show_todos: true
  show_highlights: true
  show_file_summary: false

# Comment behavior
comment_strategy:
  update_threshold: 60  # Minutes: update if < 60 min ago
  add_timestamp: true

# SDD integration
sdd:
  enabled: true
  deep_review_priorities: ["P1"]
  task_file_pattern: "specs/**/tasks.md"
---
```

All configuration is optional. The plugin works out of the box with sensible defaults.

## Performance

**Expected timing for typical PR:**
- 2 languages, no SDD: ~3-4 minutes
- 2 languages + SDD: ~4-5 minutes

**Agent timing breakdown:**
- pr-validator: ~5s (Haiku)
- code-reviewer: ~60-90s per language (Opus)
- todo-finder: ~3s (Haiku)
- sdd-task-verifier: ~45-60s (Opus)
- pr-commenter: ~20s (Sonnet)

## Error Handling

### Graceful Failures

The plugin continues with partial results if agents fail:
- "✅ Python reviewed | ⚠️ TypeScript failed | ✅ TODOs found"

### Comment Posting Failure

If posting fails (rate limit, permissions, network):
- Saves review to `/tmp/pr-review-{PR_NUMBER}.md`
- Shows helpful error message with file location
- No retry spam

### Common Errors

**"Could not find PR"**
- PR number is invalid
- Not in a git repository
- No PR exists for current branch

**"GitHub CLI not installed"**
- Install gh: `brew install gh` or visit https://cli.github.com/

**"Not authenticated"**
- Run: `gh auth login`

**"Python skill not available"**
- Install devs plugin: The plugin requires the devs plugin for language-specific reviews

## Architecture

### Components

- **Command**: `review-pr` - Orchestrates the review process
- **Agents**:
  - `pr-validator` (Haiku) - Fast validation and detection
  - `code-reviewer` (Opus) - Deep language-specific reviews
  - `todo-finder` (Haiku) - Pattern matching for TODOs
  - `sdd-task-verifier` (Opus) - SDD task verification
  - `pr-commenter` (Sonnet) - Comment management

### Design Principles

- **Parallel by default**: All independent reviews run concurrently
- **Fail gracefully**: Partial results better than no results
- **Smart updates**: Don't spam PR with duplicate comments
- **Security first**: Validates inputs, sanitizes outputs
- **Extensible**: Easy to add new languages or checks

## Troubleshooting

**Review takes too long**
- Large PRs (100+ files) may take 10+ minutes
- Consider breaking into smaller PRs
- Use `--dry-run` to test without posting

**Comment not updating**
- Check if someone else commented after Claude
- Plugin creates new comment when discussion has moved forward
- Look for `<!-- claude-code-review -->` marker in existing comments

**Language not detected**
- Check file extension matches supported languages
- Configure custom mapping in `.claude/pr-reviewer.local.md`

**SDD tasks not verified**
- Ensure `specs/**/tasks.md` file is modified in PR
- Check task format: `- [x] T001 [P1] Description (path/to/file.py)`

## Contributing

To extend this plugin:

1. **Add language support**: Create skill in devs plugin, add mapping
2. **Add custom checks**: Create new agent in `agents/`
3. **Customize reports**: Modify pr-commenter agent

## License

MIT

## Version History

- **0.7.0** (2026-02-12): Added interactive fix planning
  - New `/address-review` command to discuss and plan fixes
  - Integration with `/superpowers:brainstorming` skill
  - Complete review → plan → fix → re-review workflow

- **0.1.0** (2026-02-11): Initial release
  - Multi-language code review
  - Parallel agent execution
  - SDD task verification
  - Smart comment management
