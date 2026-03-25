---
name: worktrees:orchestrator
description: Use for multi-subagent parallel development. A main Claude instance manages multiple concurrent subagents, each working in isolated worktrees. Invoke with "/worktrees:orchestrator <feature>" or when user mentions "orchestrate agents", "parallel subagents", "coordinate development", "multi-agent workflow", "spawn subagents", or "divide feature into tasks".
argument-hint: "<feature> [--tasks <count>]"
version: "0.1.0"
arguments:
  - name: feature
    description: Feature name for orchestrated development
    required: true
  - name: "--tasks"
    description: "Number of parallel tasks (default: auto-detect from decomposition)"
    required: false
---

# Orchestrator Workflow

Coordinate multiple subagents working in parallel on isolated worktrees.

## Architecture

```
Orchestrator (main worktree)
├── Manages feature branch
├── Creates/assigns worktrees
├── Monitors progress
├── Merges work
└── Handles cleanup

Subagent 1 (worktree-1)     Subagent 2 (worktree-2)     Subagent 3 (worktree-3)
├── Works on auth           ├── Works on API             ├── Works on UI
└── Commits to branch       └── Commits to branch        └── Commits to branch
```

## Risk Assessment

**CRITICAL: Before parallelizing, evaluate task independence.**

### Questions to Ask

- Do tasks modify any of the same files?
- Are there shared configuration dependencies?
- Do tasks extend the same interfaces/types?
- Is there a temporal dependency?

### Red Flags for Serialization

| Risk | Problem | Solution |
|------|---------|----------|
| Same config files | Merge conflicts | Assign to one subagent or orchestrator |
| Same base classes | Interface conflicts | Define interfaces first, serialize extension |
| Shared state | Race conditions | Serialize or define clear boundaries |
| Database migrations | Order dependency | Run sequentially |

### Good Decomposition

- Each task modifies **distinct files/directories**
- Minimal dependencies between tasks
- Clear interfaces between components
- Testable in isolation

## Agent Roles

### Orchestrator (You)

- **Architect**: Decomposes feature into independent tasks
- **Coordinator**: Creates worktrees and assigns tasks
- **Monitor**: Tracks progress and detects conflicts early
- **Integrator**: Merges work in correct order
- **Cleaner**: Removes worktrees and branches

### Subagents (Task tool spawned)

- **Builder**: Implements assigned scope only
- **Tester**: Writes and runs tests for their component
- **Documenter**: Adds relevant documentation
- **Reporter**: Notifies completion with clear status

## Procedure

### Phase 1: Setup

#### 1.1 Prepare Main Branch

```bash
git checkout main
git pull origin main
```

#### 1.2 Ensure Gitignore

```bash
grep -q "^\.worktrees" .gitignore 2>/dev/null || echo ".worktrees/" >> .gitignore
git add .gitignore && git commit -m "chore: add .worktrees to gitignore"
```

#### 1.3 Create Feature Branch

```bash
git checkout -b feature/<feature-name>
git push -u origin feature/<feature-name>
```

#### 1.4 Decompose Feature

Identify independent tasks. Example:

```
Feature: User Management System
├── Task 1: Authentication (src/auth/*)
├── Task 2: User API (src/api/users/*)
├── Task 3: User UI (src/components/user/*)
└── Task 4: Database migrations (migrations/*)
```

#### 1.5 Create Worktrees

```bash
git worktree add -b feature/<feature>-auth .worktrees/auth feature/<feature-name>
git worktree add -b feature/<feature>-api .worktrees/api feature/<feature-name>
git worktree add -b feature/<feature>-ui .worktrees/ui feature/<feature-name>

# Verify
git worktree list
```

### Phase 2: Task Assignment

Use the **Task tool** to spawn subagents with clear assignments.

#### Task Assignment Template

```markdown
## Task Assignment

**Worktree Path:** .worktrees/<name>
**Branch:** feature/<feature>-<component>
**Base Branch:** feature/<feature-name>

### Scope
<Specific files/directories to modify>

### Boundaries
- Only modify files in <path>/
- Do not modify shared configurations
- Interface via <exported types/functions>

### Dependencies
<Other tasks this depends on, or "None">

### Deliverables
- [ ] <Specific deliverable 1>
- [ ] <Specific deliverable 2>
- [ ] Unit tests
- [ ] Commits pushed to branch

### Completion Signal
Notify when all deliverables complete.
```

#### Using Task Tool

```typescript
// Spawn subagent for auth task
Task({
  prompt: `## Task: Authentication Module

**Worktree:** .worktrees/auth
**Branch:** feature/user-mgmt-auth

### Scope
Implement AuthService in src/auth/:
- JWT token generation/validation
- Password hashing with bcrypt
- Session management

### Boundaries
- Only modify src/auth/*
- Export AuthService interface for API layer

### Deliverables
- AuthService with login/logout/validateToken
- Unit tests in tests/auth/
- Commits pushed

Navigate to worktree and begin implementation.`,
  subagent_type: "general-purpose"
});
```

### Phase 3: Monitoring

#### Check Progress

```bash
# Worktree status
git worktree list

# Branch activity
git log --oneline -5 feature/<feature>-auth
git log --oneline -5 feature/<feature>-api

# Recent commits across all
git log --oneline --all --since="1 hour ago"
```

#### Detect Conflicts Early

```bash
# Dry-run merge
git merge --no-commit --no-ff feature/<feature>-auth
git merge --abort  # Cancel

# Or use merge-tree
git merge-tree $(git merge-base HEAD feature/<feature>-auth) HEAD feature/<feature>-auth
```

### Phase 4: Integration

#### Merge Order

Merge in dependency order (e.g., DB → Auth → API → UI):

```bash
git checkout feature/<feature-name>

# Merge each component
git merge feature/<feature>-db --no-ff -m "Merge database migrations"
npm test  # Verify

git merge feature/<feature>-auth --no-ff -m "Merge authentication"
npm test  # Verify

git merge feature/<feature>-api --no-ff -m "Merge API endpoints"
npm test  # Verify

git merge feature/<feature>-ui --no-ff -m "Merge UI components"
npm test  # Full integration test
```

#### Conflict Resolution

If conflicts occur:

```bash
# See conflicting files
git status

# Resolve conflicts (edit files, remove markers)
git add <resolved-files>
git commit -m "Merge feature/<feature>-api, resolve config conflict"
```

**Common conflict patterns:**
- Shared configs → Have orchestrator handle or assign to one subagent
- Import statements → Combine in logical order
- Type definitions → Merge types, ensure no overlap

### Phase 5: Cleanup

```bash
# Remove worktrees
git worktree remove .worktrees/auth
git worktree remove .worktrees/api
git worktree remove .worktrees/ui

# Prune
git worktree prune

# Delete local branches
git branch -d feature/<feature>-auth
git branch -d feature/<feature>-api
git branch -d feature/<feature>-ui

# Delete remote branches
git push origin --delete feature/<feature>-auth
git push origin --delete feature/<feature>-api
git push origin --delete feature/<feature>-ui
```

## Plan Mode for Subagents

Recommend subagents use Plan Mode for complex tasks:

```markdown
### Working Method
Start in Plan Mode for safe exploration:
1. Analyze existing code in scope area
2. Design implementation approach
3. Identify any shared file concerns
4. Exit Plan Mode when approach is clear
5. Implement following the plan
```

## Desktop Organization Tips

For visual orchestration with multiple windows:

- **One Space/Desktop per worktree** - Quick switching
- **Consistent layout**: IDE left, Claude right
- **Keyboard shortcuts** for rapid navigation
- **Separate terminal tabs** per worktree

## Error Handling

### Subagent Fails to Complete

```bash
# Check status
cd .worktrees/<name>
git status
git log --oneline -3

# Options:
# 1. Reassign to different subagent
# 2. Orchestrator completes task
# 3. Abandon and adjust scope

# If abandoning:
cd ../..  # Return to main
git worktree remove --force .worktrees/<name>
git branch -D feature/<feature>-<name>
```

### Merge Failure Midway

```bash
# Abort current merge
git merge --abort

# Reset to pre-integration
git reflog  # Find commit
git reset --hard <pre-integration-commit>

# Re-attempt with different strategy
```

### Worktree Corruption

```bash
git worktree remove --force .worktrees/<name>
git worktree prune
git worktree add -b feature/<feature>-<name> .worktrees/<name> feature/<feature-name>
```

## Checklist

### Setup Phase
- [ ] Main branch up to date
- [ ] `.worktrees/` in `.gitignore`
- [ ] Feature branch created and pushed
- [ ] **Risk assessment completed**
- [ ] Tasks decomposed into independent units
- [ ] Worktrees created with descriptive names
- [ ] Task assignments documented

### Execution Phase
- [ ] Subagents spawned with Task tool
- [ ] Progress monitored regularly
- [ ] Conflicts detected early
- [ ] Dependencies coordinated

### Integration Phase
- [ ] All subagent work complete
- [ ] Merges in dependency order
- [ ] Conflicts resolved
- [ ] Integration tests pass

### Cleanup Phase
- [ ] All worktrees removed
- [ ] Local branches deleted
- [ ] Remote branches deleted
- [ ] Stale references pruned
- [ ] Feature branch ready for PR

## Example: User Management System

```bash
# Setup
git checkout main && git pull
git checkout -b feature/user-management

# Create worktrees
git worktree add -b feature/user-mgmt-auth .worktrees/auth feature/user-management
git worktree add -b feature/user-mgmt-api .worktrees/api feature/user-management
git worktree add -b feature/user-mgmt-ui .worktrees/ui feature/user-management

# [Spawn subagents with Task tool for each]

# Integration (after subagents complete)
git checkout feature/user-management
git merge feature/user-mgmt-auth --no-ff -m "Merge auth module"
git merge feature/user-mgmt-api --no-ff -m "Merge API endpoints"
git merge feature/user-mgmt-ui --no-ff -m "Merge UI components"
npm test

# Cleanup
git worktree remove .worktrees/auth
git worktree remove .worktrees/api
git worktree remove .worktrees/ui
git worktree prune
git branch -d feature/user-mgmt-auth feature/user-mgmt-api feature/user-mgmt-ui

# Create PR to main
gh pr create --base main --title "feat: Add user management system"
```
