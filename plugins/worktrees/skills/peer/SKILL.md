---
name: worktrees:peer
description: Use for independent development with PR-based integration. Multiple Claude instances work autonomously, each creating PRs to main. Invoke with "/worktrees:peer <feature>" or when user mentions "peer workflow", "independent worktree", "autonomous development", "PR-based workflow", or "multi-instance development".
argument-hint: "<feature> [--id <identifier>]"
version: "0.1.0"
arguments:
  - name: feature
    description: Feature name for the worktree
    required: true
  - name: "--id"
    description: "Instance identifier (default: auto-generate)"
    required: false
---

# Peer Workflow

Independent development with PR-based integration. Each instance works autonomously, creating PRs to main.

## Architecture

```
Instance A (worktree-a)          Instance B (worktree-b)
├── Creates own worktree         ├── Creates own worktree
├── Develops feature X           ├── Develops feature Y
├── Creates PR to main           ├── Creates PR to main
├── Gets PR merged               ├── Gets PR merged
└── Cleans up worktree           └── Cleans up worktree

                    ↓                      ↓
                    └──────── main ────────┘
                         (integration point)
```

## Key Principles

1. **Complete Autonomy** - Each instance operates independently
2. **Main as Integration** - All PRs target main
3. **Prevention Over Resolution** - Avoid conflicts by working in separate areas

## The Explore-Plan-Code-Commit Workflow

For safe, methodical development in your worktree:

### 1. Explore

Understand the codebase before making changes:

```bash
# Understand project structure
ls -la src/
git log --oneline -10

# Find related code
grep -r "related-pattern" src/
```

### 2. Plan

Use Plan Mode for complex changes:

- Start Claude in Plan Mode for safe exploration
- Review proposed changes before execution
- Particularly valuable when touching shared files
- Exit Plan Mode only when approach is clear

### 3. Code

Implement with focused, atomic changes:

- Work within defined scope
- Make small, testable changes
- Run tests frequently
- Commit atomically

### 4. Commit

Push regularly to maintain progress:

```bash
git add <specific-files>
git commit -m "feat(<scope>): <description>"
git push -u origin <branch>
```

## Procedure

### Step 1: Create Worktree

```bash
# Ensure .worktrees is gitignored (first time only)
grep -q "^\.worktrees" .gitignore 2>/dev/null || echo ".worktrees/" >> .gitignore
git add .gitignore && git commit -m "chore: add .worktrees to gitignore"

# Create uniquely named worktree
# Pattern: {instance-id}-{feature} or just {feature}
git worktree add -b feature/<id>-<feature> .worktrees/<id> main

cd .worktrees/<id>
```

**Naming options for `<id>`:**
- Instance ID: `inst-alpha`, `inst-42`, `agent-a`
- Timestamp: `$(date +%Y%m%d-%H%M)`
- UUID prefix: `$(uuidgen | cut -c1-6)`

### Step 2: Development

Work following the Explore-Plan-Code-Commit cycle:

```bash
# Make changes, commit atomically
git add src/feature/
git commit -m "feat(<scope>): add main functionality"

git add tests/feature/
git commit -m "test(<scope>): add unit tests"

# Push regularly
git push -u origin feature/<id>-<feature>
```

### Step 3: Create PR

```bash
# Ensure up to date with main
git fetch origin main
git rebase origin/main
git push --force-with-lease

# Create PR
gh pr create \
  --base main \
  --title "feat(<scope>): <description>" \
  --body "## Summary
<What this accomplishes>

## Changes
- <Change 1>
- <Change 2>

## Affected Areas
- \`src/<area>/\` - <description>

## Does NOT Modify
- <Other areas untouched>

## Testing
\`\`\`bash
npm test src/<area>/
\`\`\`

## Instance Context
- Instance: <id>
- Worktree: .worktrees/<id>
- Independent feature, no coordination needed"
```

### Step 4: PR Lifecycle

```bash
# Monitor status
gh pr status
gh pr checks

# Respond to feedback
gh pr view --comments

# After approval
gh pr merge --squash --delete-branch
```

### Step 5: Cleanup

```bash
# Return to main project directory
cd ../..  # Exit .worktrees/<id> to project root

# Pull merged changes
git checkout main
git pull origin main

# Remove worktree
git worktree remove .worktrees/<id>

# Clean up
git branch -d feature/<id>-<feature> 2>/dev/null
git worktree prune
```

## Using Plan Mode

For complex changes or when touching shared areas:

1. **Start in Plan Mode** - Safe exploration without execution
2. **Analyze dependencies** - Understand what your changes affect
3. **Identify conflicts early** - Check if others are working nearby
4. **Review proposed changes** - Validate approach before coding
5. **Exit Plan Mode** - Execute with confidence

**When to use Plan Mode:**
- Modifying shared configuration files
- Refactoring that touches multiple files
- Changes with unclear scope
- First time working in unfamiliar area

## Conflict Avoidance

### Scope Communication

Use PR descriptions to communicate scope:

```markdown
## Affected Areas
- `src/payments/**` - New payment module
- `src/config/payments.ts` - Payment configuration

## Does NOT Modify
- User authentication
- API routing (new routes only)
- Existing database tables
```

### Area Ownership

Informally claim areas during active development:

| Area | Active Instance |
|------|-----------------|
| src/payments/ | Instance Alpha |
| src/dashboard/ | Instance Beta |

### Small, Fast PRs

- Keep PRs focused and small
- Merge promptly after approval
- Avoid long-running feature branches
- Split large features into incremental PRs

## Handling Conflicts

### Pre-PR Conflict Check

```bash
git fetch origin main
git rebase origin/main

# If conflicts, resolve:
# Edit conflicting files
git add <resolved-files>
git rebase --continue
git push --force-with-lease
```

### Post-Merge Conflicts

If another PR merged first:

```bash
git fetch origin main
git rebase origin/main
# Resolve conflicts
git add .
git rebase --continue
git push --force-with-lease
```

## Error Recovery

### Worktree Left Behind

```bash
git worktree list  # Find orphaned worktree
git worktree remove .worktrees/<orphaned> --force
git worktree prune
git branch -D feature/<orphaned-branch>
git push origin --delete feature/<orphaned-branch>
```

### PR Abandoned

```bash
gh pr close <number> --comment "Cleaning up abandoned PR"
git push origin --delete feature/<abandoned-branch>
git worktree remove .worktrees/<abandoned> --force
```

## Checklist

### Startup
- [ ] `.worktrees/` is in `.gitignore`
- [ ] Unique instance identifier chosen
- [ ] Worktree created with descriptive naming
- [ ] Scope understood and communicated

### Development
- [ ] Following Explore-Plan-Code-Commit
- [ ] Working within defined scope
- [ ] Atomic commits with clear messages
- [ ] Regular pushes to remote

### PR Phase
- [ ] Rebased on latest main
- [ ] Descriptive PR with scope communication
- [ ] Tests passing
- [ ] Reviews requested

### Cleanup
- [ ] PR merged
- [ ] Worktree removed
- [ ] Branches deleted
- [ ] References pruned

## Example: Payment Integration

```bash
# Setup
git worktree add -b feature/inst-alpha-payments .worktrees/inst-alpha main
cd .worktrees/inst-alpha

# Development
mkdir -p src/payments tests/payments
# ... implement ...
git add src/payments/
git commit -m "feat(payments): add Stripe integration"
git push -u origin feature/inst-alpha-payments

# PR
gh pr create --base main --title "feat(payments): Add Stripe integration"

# After merge
cd ../..
git checkout main && git pull
git worktree remove .worktrees/inst-alpha
git worktree prune
```
