# Agent Foundry

Build. Ship. Repeat. A collection of Claude Code plugins for devs.

## Plugins

### Specs & Planning

Plugins that turn ideas into specs, plans, tasks, and decisions — from vision documents and constitutions through guided spec writing to structured decision-making techniques.

**Totals:** 10 skills · 35 references · 2 examples · 17 commands · 4 agents · 2 hooks

| Plugin | Version | Description |
|--------|---------|-------------|
| [sdd](plugins/sdd) | 0.7.1 | Specification-Driven Development: specs, plans, tasks, codebase mapping, and quality gates<br><sub>🛠 2 skills · 📋 10 commands · 🤖 1 agent</sub> |
| [spec-writer](plugins/spec-writer) | 0.7.1 | Guided discovery process for writing complete feature specifications<br><sub>🛠 1 skill</sub> |
| [ideas](plugins/ideas) | 0.8.1 | Turn vague ideas into sharp vision documents through structured creative collaboration<br><sub>🛠 3 skills</sub> |
| [decision-making](plugins/decision-making) | 0.1.0 | Seven structured decision-making techniques that exploit the subagent architecture to produce verdicts plan steps can branch on<br><sub>🛠 1 skill · 📋 7 commands · 🤖 2 agents</sub> |
| [constitution](plugins/constitution) | 0.7.2 | Create, validate, and enforce project constitutions with living governance<br><sub>🛠 3 skills · 🤖 1 agent</sub> |

### Development

Language specialists, git workflows, environments, and PR tooling for writing, building, and shipping code.

**Totals:** 38 skills · 190 references · 39 examples · 7 commands · 17 agents

| Plugin | Version | Description |
|--------|---------|-------------|
| [devs](plugins/devs) | 0.8.1 | Specialist coding agents and skills for Python, Rust, TypeScript, React, and security<br><sub>🛠 8 skills · 📋 1 command · 🤖 7 agents</sub> |
| [flutter-core](plugins/flutter-core) | 0.7.1 | Flutter and Dart development toolkit covering UI/UX, state management, testing, and ServerPod<br><sub>🛠 13 skills · 📋 4 commands · 🤖 5 agents</sub> |
| [dev-specialisms](plugins/dev-specialisms) | 0.7.1 | Niche developer skills: deployment, frontend vibes, Hashbrown<br><sub>🛠 4 skills</sub> |
| [git-lovely](plugins/git-lovely) | 0.7.1 | Lovely Git workflows with conventional commits and GitHub CLI integration<br><sub>🛠 2 skills · 📋 1 command</sub> |
| [worktrees](plugins/worktrees) | 0.7.1 | Git worktree workflows for parallel AI development<br><sub>🛠 6 skills</sub> |
| [sandbox](plugins/sandbox) | 0.7.1 | Isolated Docker-based development environments for Claude Code<br><sub>🛠 3 skills · 📋 1 command</sub> |
| [pr-tools](plugins/pr-tools) | 0.7.1 | Parallel PR review agents for code quality, SDD task verification, and TODO tracking<br><sub>🛠 2 skills · 🤖 5 agents</sub> |

### Security

Supply chain protection and dependency attack guards with deterministic, hook-enforced checks.

**Totals:** 3 skills · 7 examples · 2 commands · 19 hooks

| Plugin | Version | Description |
|--------|---------|-------------|
| [supply-chain-defence](plugins/supply-chain-defence) | 0.2.0 | Protect npm/pnpm/yarn/bun projects from supply chain attacks with deterministic hook-based guards<br><sub>🛠 3 skills · 📋 2 commands · 🪝 19 hooks</sub> |

### UI/UX

Interface and interaction design — opinionated design systems that resist AI slop convergence.

**Totals:** 4 skills · 3 references

| Plugin | Version | Description |
|--------|---------|-------------|
| [design-systems](plugins/design-systems) | 0.1.1 | Create, implement, review, and visualize opinionated design systems that resist AI slop convergence<br><sub>🛠 4 skills</sub> |

### Content & Design

Written and visual content creation — READMEs and repo documentation, AI image generation, and writing voice design.

**Totals:** 6 skills · 15 references · 9 examples · 2 commands · 2 agents · 1 MCP server

| Plugin | Version | Description |
|--------|---------|-------------|
| [readme-and-co](plugins/readme-and-co) | 0.7.1 | Generate README, LICENSE, CONTRIBUTING, SECURITY, and GitHub templates<br><sub>🛠 4 skills · 📋 1 command · 🤖 1 agent</sub> |
| [image-gen](plugins/image-gen) | 0.1.1 | AI-powered image generation using Google Gemini models via nanobanana MCP server<br><sub>🛠 1 skill · 🔌 1 MCP server</sub> |
| [lexisim](plugins/lexisim) | 0.1.1 | Design writing voices from scratch or by emulating references, then generate a writer skill and assistant<br><sub>🛠 1 skill · 📋 1 command · 🤖 1 agent</sub> |

### Utilities & Configuration

Plugin management, diagnostics, settings presets, and session transcript sharing.

**Totals:** 8 skills · 9 references · 11 examples · 1 command · 1 hook

| Plugin | Version | Description |
|--------|---------|-------------|
| [utils](plugins/utils) | 0.9.1 | Plugin management utilities: dependency checking, scanning, and root resolution<br><sub>🛠 5 skills · 🪝 1 hook</sub> |
| [settings-presets](plugins/settings-presets) | 0.7.1 | Powerline status line and attribution configuration presets<br><sub>🛠 2 skills</sub> |
| [share-transcript](plugins/share-transcript) | 0.1.0 | Convert session transcripts to shareable HTML/Markdown with redaction, themes, and progressive disclosure<br><sub>🛠 1 skill · 📋 1 command</sub> |

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
