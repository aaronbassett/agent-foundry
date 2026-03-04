# Worktrees Plugin

Git worktree workflows for parallel AI development.

## Overview

This plugin provides actionable skills for managing git worktrees in AI-assisted development workflows. It supports both orchestrator patterns (where a main agent coordinates subagents) and peer patterns (where independent agents work autonomously).

## Installation

Add this plugin to your Claude Code configuration:

```json
{
  "plugins": [
    "aaronbassett/agent-foundry/plugins/worktrees"
  ]
}
```

## Skills

### `/worktrees:new <name> [--base <branch>] [--lock]`

Create a new worktree with safety checks.

```
/worktrees:new feature-auth
/worktrees:new hotfix-login --base release/v2
/worktrees:new critical-work --lock
```

**Features:**
- Verifies `.worktrees/` is in `.gitignore`
- Creates worktree with new branch
- Provides next steps guidance

### `/worktrees:orchestrator <feature>`

Start multi-subagent parallel development.

```
/worktrees:orchestrator user-management
```

**Features:**
- Risk assessment for task parallelization
- Task decomposition guidance
- Worktree creation for subagents
- Task tool integration for spawning subagents
- Merge coordination and cleanup

### `/worktrees:peer <feature>`

Start independent development with PR-based integration.

```
/worktrees:peer payment-integration
```

**Features:**
- Instance identification patterns
- Explore-Plan-Code-Commit workflow
- Plan Mode recommendations
- PR-based integration flow
- Conflict avoidance strategies

### `/worktrees:finish [--pr|--merge] [--force]`

Complete work and clean up.

```
/worktrees:finish --pr
/worktrees:finish --merge
/worktrees:finish --force
```

**Features:**
- PR creation or direct merge
- Worktree removal
- Branch cleanup
- Force cleanup for abandoned work

### `/worktrees:status`

Display comprehensive worktree status.

```
/worktrees:status
```

**Shows:**
- Active worktrees and their branches
- Stale references needing cleanup
- Uncommitted changes across all worktrees
- Locked worktrees

### `/worktrees:concepts`

Comprehensive reference documentation.

```
/worktrees:concepts
```

**Covers:**
- Git worktree concepts and commands
- Environment isolation (ports, databases)
- Workspace organization
- Resource considerations
- Best practices

## Quick Start

### Peer Workflow (Independent Work)

```bash
# Create worktree
/worktrees:new feature-payments

# ... develop in worktree ...

# Finish and create PR
/worktrees:finish --pr
```

### Orchestrator Workflow (Parallel Subagents)

```bash
# Start orchestrated development
/worktrees:orchestrator user-management

# Follow prompts to:
# 1. Decompose into tasks
# 2. Create worktrees
# 3. Spawn subagents
# 4. Monitor and merge
# 5. Clean up
```

## Directory Structure

Worktrees are organized in `.worktrees/` within your project:

```
my-project/
├── .git/
├── .gitignore          # Contains .worktrees/
├── .worktrees/
│   ├── feature-auth/
│   ├── feature-api/
│   └── inst-alpha/
└── src/
```

## Key Concepts

### Worktrees

Git worktrees allow checking out multiple branches simultaneously in separate directories. All worktrees share the same `.git` repository.

### Orchestrator Pattern

A main Claude instance coordinates multiple subagents:
- Decomposes features into independent tasks
- Creates worktrees for each subagent
- Monitors progress and merges results
- Handles cleanup

### Peer Pattern

Multiple independent Claude instances work autonomously:
- Each creates their own worktree
- Work integrates via PRs to main
- No central coordination needed

## Hooks

This plugin includes safety hooks that provide reminders during worktree operations:

### Branch Switch Warning

When running `git checkout` or `git switch` commands, reminds you to check for active worktrees that might conflict.

### Gitignore Check

When running `git worktree add`, reminds you to ensure `.worktrees/` is in `.gitignore` to prevent accidentally committing nested repositories.

## Resources

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [Steve Kinney: Git Worktrees for AI Development](https://stevekinney.com/courses/ai-development/git-worktrees)
- [incident.io: Shipping Faster with Claude Code](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Aaron Bassett ([@aaronbassett](https://github.com/aaronbassett))
