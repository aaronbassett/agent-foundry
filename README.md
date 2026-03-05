# Agent Foundry

Build. Ship. Repeat. A collection of Claude Code plugins for devs.

## Plugins

| Plugin | Description |
|--------|-------------|
| [constitution](plugins/constitution) | Create, validate, and enforce project constitutions with living governance |
| [dev-specialisms](plugins/dev-specialisms) | Niche developer skills (deployment, frontend vibes, Hashbrown) |
| [devs](plugins/devs) | Specialist coding agents and skills for Python, Rust, TypeScript, React, and security |
| [flutter-core](plugins/flutter-core) | Flutter and Dart development toolkit covering UI/UX, state management, testing, and ServerPod |
| [git-lovely](plugins/git-lovely) | Lovely Git workflows with conventional commits and GitHub CLI integration |
| [ideas](plugins/ideas) | Turn vague ideas into sharp vision documents through structured creative collaboration |
| [image-gen](plugins/image-gen) | AI-powered image generation using Google Gemini models via nanobanana MCP server |
| [pr-tools](plugins/pr-tools) | Parallel PR review agents for code quality, SDD task verification, and TODO tracking |
| [readme-and-co](plugins/readme-and-co) | Generate README, LICENSE, CONTRIBUTING, SECURITY, and GitHub templates |
| [sandbox](plugins/sandbox) | Isolated Docker-based development environments for Claude Code |
| [sdd](plugins/sdd) | Specification-Driven Development: specs, plans, tasks, codebase mapping, and quality gates |
| [settings-presets](plugins/settings-presets) | Powerline status line and attribution configuration presets |
| [spec-writer](plugins/spec-writer) | Guided discovery process for writing complete feature specifications |
| [utils](plugins/utils) | Plugin management utilities: dependency checking, scanning, and root resolution |
| [worktrees](plugins/worktrees) | Git worktree workflows for parallel AI development |

## Installation

Add the marketplace, then install individual plugins:

```bash
claude mcp add-marketplace aaronbassett/agent-foundry
claude plugin install sdd@agent-foundry
```

Or install a plugin directly from the repo:

```bash
claude install-plugin https://github.com/aaronbassett/agent-foundry/tree/main/plugins/sdd
```

## Development

### Git Hooks Setup

This repository uses [lefthook](https://github.com/evilmartians/lefthook) for git hooks.

1. Check lefthook is installed: `lefthook --version`
2. Activate hooks: `lefthook install`
3. Hooks will now run automatically on commit and push

### Validation

**Automatic validation:**
- Pre-commit: Validates changed plugins
- Pre-push: Validates all plugins + marketplace

**Manual validation:**
- All plugins: `scripts/validate-marketplace.sh`
- Single plugin: `scripts/validate-plugin.sh <plugin-name>`
- CI validation: `scripts/ci/validate.sh`

**Bypassing hooks:**

Use `git commit --no-verify` or `git push --no-verify` when:
- Emergency hotfixes
- Documentation-only changes
- Hook issues need investigation

Note: GitHub Actions will still validate all changes.

## License

[MIT](LICENSE)
