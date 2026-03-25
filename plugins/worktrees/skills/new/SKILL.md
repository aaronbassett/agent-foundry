---
name: worktrees:new
description: Use when creating a new git worktree. Handles gitignore setup, worktree creation, and provides guidance. Invoke with "/worktrees:new <name>" or when user mentions "create worktree", "new worktree", "start feature in worktree", or "isolated workspace".
argument-hint: "<name> [--base <branch>] [--lock]"
version: "0.1.0"
arguments:
  - name: name
    description: Name for the worktree and branch
    required: true
  - name: "--base"
    description: "Base branch (default: main)"
    required: false
  - name: "--lock"
    description: Lock worktree after creation
    required: false
---

# Create New Worktree

Create an isolated worktree for parallel development.

## Arguments

- `<name>` - Worktree and branch name (required)
- `--base <branch>` - Base branch (default: main)
- `--lock` - Lock worktree after creation

## Procedure

### 1. Verify Gitignore Setup

**First, check if `.worktrees/` is in `.gitignore`:**

```bash
grep -q "^\.worktrees" .gitignore 2>/dev/null && echo "OK: .worktrees already gitignored" || echo "MISSING: Need to add .worktrees to gitignore"
```

**If missing, add and commit:**

```bash
echo ".worktrees/" >> .gitignore
git add .gitignore
git commit -m "chore: add .worktrees to gitignore"
```

> **Why gitignore?** Each worktree contains a complete checkout. Without gitignoring, you'd accidentally commit nested copies of your entire codebase.

### 2. Create the Worktree

**Standard creation (new branch from base):**

```bash
# Replace <name> with the provided name, <base> with --base value or "main"
git worktree add -b feature/<name> .worktrees/<name> <base>
```

**With lock flag:**

```bash
git worktree add --lock -b feature/<name> .worktrees/<name> <base>
```

### 3. Verify Creation

```bash
git worktree list
```

Expected output shows new worktree:
```
/path/to/project              abc1234 [main]
/path/to/project/.worktrees/<name>  abc1234 [feature/<name>]
```

### 4. Navigate to Worktree

```bash
cd .worktrees/<name>
```

## Next Steps

After creating the worktree:

1. **Start development** in the isolated environment
2. **Make atomic commits** as you work
3. **Push regularly** to remote: `git push -u origin feature/<name>`
4. When done, use `/worktrees:finish` to clean up

## Common Options

| Scenario | Command |
|----------|---------|
| Basic feature | `git worktree add -b feature/my-feature .worktrees/my-feature main` |
| From release branch | `git worktree add -b hotfix/urgent .worktrees/urgent release/v2` |
| Locked worktree | `git worktree add --lock -b feature/critical .worktrees/critical main` |
| With existing branch | `git worktree add .worktrees/existing-branch existing-branch` |

## Troubleshooting

### Branch Already Checked Out

**Error:** `fatal: 'branch-name' is already checked out at '/path'`

**Solution:** Each branch can only exist in one worktree. Either:
- Use the existing worktree: `git worktree list`
- Create with a different branch name
- Remove the existing worktree first

### Directory Already Exists

**Error:** `fatal: destination path already exists`

**Solution:** The `.worktrees/<name>` directory exists. Either:
- Choose a different name
- Remove existing: `rm -rf .worktrees/<name> && git worktree prune`

## Quick Reference

```bash
# Create worktree with new branch
git worktree add -b <branch> .worktrees/<name> [base]

# Create worktree with existing branch
git worktree add .worktrees/<name> <branch>

# List worktrees
git worktree list

# Lock/unlock
git worktree lock .worktrees/<name>
git worktree unlock .worktrees/<name>
```
