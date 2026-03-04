# SDD (Specification-Driven Development) Plugin

A comprehensive workflow plugin for Claude Code that enables specification-driven development practices. This plugin helps you define project governance, create detailed feature specifications, map codebases, plan implementations, generate tasks, and execute with quality gates.

## Acknowledgments

This plugin is based on [Spec Kit](https://github.com/github/spec-kit) by GitHub, Inc. (MIT License). SDD started as a custom fork of spec-kit's commands and templates, adapted and extended with new features and modified workflows, while maintaining the core spec-driven development philosophy.

Original work: **Copyright GitHub, Inc.**
Modifications and additions: **Copyright (c) 2026 Aaron Bassett**

This plugin was also influenced by concepts from [Get Shit Done (GSD)](https://github.com/glittercowboy/get-shit-done) by TÂCHES (MIT License), particularly its approach to codebase mapping.

## Features

- **Project Constitution**: Define engineering principles and quality gates through guided discovery
- **Feature Specifications**: Create detailed, testable feature specs with user stories
- **Parallel Codebase Mapping**: Analyze projects across 8 dimensions (stack, architecture, security, etc.)
- **Implementation Planning**: Generate technical plans with library selection and structure design
- **Task Generation**: Automatically create dependency-ordered, parallelizable task lists
- **Quality Analysis**: Validate consistency across specifications, plans, and implementation
- **Drift Detection**: Track codebase evolution and update artifacts when structure changes
- **Retrospectives**: Capture implementation learnings to build institutional knowledge
- **Multi-agent Execution**: Orchestrate Claude Code agents for parallel implementation
- **GitHub Integration**: Built-in git workflow with PR gates and CI verification

## Installation

1. Add the marketplace in Claude Code:
   ```bash
   /plugin marketplace add aaronbassett/agent-foundry
   ```

2. Install the SDD plugin:
   ```bash
   /plugin install sdd@agent-foundry
   ```

3. **IMPORTANT**: This plugin requires the `utils` plugin from the same
   marketplace for the CPR (Claude Plugin Root) resolver functionality.
   Ensure utils is installed first.
   ```bash
   /plugin install utils@agent-foundry
   ```

## Quick Start

Here's a typical 6-step workflow for developing a new feature:

### 1. Create Project Constitution (first time only)
```bash
/sdd:constitution
```
Define your project's engineering principles, quality standards, and governance rules through an interactive discovery process.

### 2. Map Your Codebase
```bash
/sdd:map
```
Generate 8 specialized documents analyzing your tech stack, architecture, security, conventions, and more using parallel mapper agents.

### 3. Create Feature Specification
```bash
/sdd:specify user authentication with JWT
```
Build a detailed feature spec with user stories, acceptance criteria, and technical requirements.

### 4. Generate Implementation Plan
```bash
/sdd:plan
```
Create a technical plan with library selections, data models, API contracts, and architectural decisions.

### 5. Generate Task List
```bash
/sdd:tasks
```
Automatically generate a dependency-ordered, parallelizable task list organized by user story.

### 6. Execute Implementation
```bash
/sdd:implement
```
Execute tasks in phases with quality gates, automated commits, PR creation, and CI verification.

## Available Commands

| Command | Description |
|---------|-------------|
| `/sdd:constitution` | Create or update project constitution through guided discovery |
| `/sdd:specify` | Create detailed feature specifications with user stories |
| `/sdd:map` | Map codebase into 8 specialized documents using parallel agents |
| `/sdd:plan` | Generate implementation plan with tech stack and architecture |
| `/sdd:tasks` | Generate dependency-ordered task list from specifications |
| `/sdd:implement` | Execute implementation in phases with quality gates |
| `/sdd:analyze` | Validate consistency across specs, plans, and code |
| `/sdd:checklist` | Run pre-implementation quality checklist |
| `/sdd:clarify` | Get clarification on specifications or plans |
| `/sdd:taskstoissues` | Convert tasks to GitHub issues for tracking |

## Directory Structure

The SDD plugin organizes all artifacts in the `.sdd/` directory:

```
.sdd/
├── codebase/              # Codebase analysis documents
│   ├── STACK.md           # Technology stack
│   ├── INTEGRATIONS.md    # External integrations
│   ├── ARCHITECTURE.md    # Architectural patterns
│   ├── STRUCTURE.md       # Directory structure
│   ├── CONVENTIONS.md     # Coding conventions
│   ├── TESTING.md         # Testing strategy
│   ├── SECURITY.md        # Security patterns
│   └── CONCERNS.md        # Technical concerns
├── memory/                # Project governance
│   └── constitution.md    # Engineering principles
├── specs/                 # Feature specifications
│   └── {number}-{name}/   # Feature directory
│       ├── spec.md        # Feature specification
│       ├── plan.md        # Implementation plan
│       ├── tasks.md       # Task list
│       ├── data-model.md  # Data models (optional)
│       ├── contracts/     # API contracts (optional)
│       └── research.md    # Research notes (optional)
└── retro/                 # Implementation retrospectives
    └── P{N}.md            # Phase retrospectives
```

## Workflow Phases

The SDD workflow follows 8 distinct phases:

1. **Constitution**: Define project governance and engineering principles
2. **Codebase Mapping**: Analyze existing code across 8 dimensions
3. **Specification**: Create feature spec with user stories and acceptance criteria
4. **Planning**: Design implementation with tech stack and architecture
5. **Task Generation**: Create dependency-ordered, parallelizable task list
6. **Analysis**: Validate consistency across all artifacts
7. **Implementation**: Execute tasks in phases with quality gates
8. **Review**: Retrospectives and drift detection for continuous improvement

Each phase builds on previous phases and creates artifacts that inform subsequent work.

## License

MIT License

Based on spec-kit (https://github.com/github/spec-kit)
Copyright GitHub, Inc.

Modifications and additions:
Copyright (c) 2026 Aaron Bassett

See [LICENSE](./LICENSE) file for full license text.

## Contributing

Contributions are welcome! Please:

1. Open an issue to discuss proposed changes
2. Follow existing code patterns and documentation style
3. Test changes thoroughly before submitting PR
4. Update documentation for new features

For bugs and feature requests, visit the [marketplace issues](https://github.com/aaronbassett/agent-foundry/issues).

## Support

For questions and support:
- Review the command documentation in `commands/` directory
- Check skill references in `skills/sdd-infrastructure/references/`
- Open an issue in the marketplace repository
- Review the original [spec-kit documentation](https://github.com/github/spec-kit) for core concepts
