---
name: devs:check-deps
description: Scan a project for all dependency ecosystems (TypeScript, Rust, Python) and run concurrent health checks across each one. Reports outdated packages, security vulnerabilities, and dependency status.
allowed-tools: Agent, Glob, Read, Bash, AskUserQuestion
argument-hint: "[path or ecosystem filter]"
---

Check project dependencies across all detected ecosystems by dispatching concurrent agents.

## Input Handling

- **No arguments**: scan the current working directory
- **Path argument**: scan that directory (e.g., `$ARGUMENTS` is a path)
- **Ecosystem filter**: if `$ARGUMENTS` is "typescript", "rust", or "python", only check that ecosystem

## Step 1: Detect Ecosystems

Scan the project root (or provided path) for manifest files. Exclude dependency directories:

```
Glob for:
  - **/package.json (exclude node_modules/**)
  - **/Cargo.toml (exclude target/**)
  - **/pyproject.toml (exclude .venv/**)
  - **/requirements.txt (exclude .venv/**)
```

Classify findings:

| Files Found | Ecosystem |
|---|---|
| Any `package.json` | typescript |
| Any `Cargo.toml` | rust |
| Any `pyproject.toml` or `requirements.txt` | python |

If `$ARGUMENTS` is an ecosystem name, only report that ecosystem even if others are present.

## Step 2: Handle No Results

If no manifest files found:

> No supported dependency manifests found in this project. Supported ecosystems: TypeScript (package.json), Rust (Cargo.toml), Python (pyproject.toml / requirements.txt).

## Step 3: Dispatch Agents

**Single ecosystem detected (or filtered):**

Dispatch one `devs:deps-maintenance` agent with:
- The ecosystem name
- The manifest file path(s)
- Instruction: "Check for outdated dependencies and security vulnerabilities. Report findings grouped by severity."

**Multiple ecosystems detected:**

Dispatch one `devs:deps-maintenance` agent **per ecosystem, concurrently**. Each receives:
- Its specific ecosystem name (e.g., "typescript", "rust", "python")
- The manifest file path(s) for that ecosystem
- Instruction: "Focus on the [ecosystem] dependencies only. Check for outdated dependencies and security vulnerabilities. Report findings grouped by severity."

## Step 4: Present Results

Collect results from all agents and present a consolidated report:

```
## Dependency Health Report

### TypeScript (npm)
[agent results]

### Rust (cargo)
[agent results]

### Python (poetry)
[agent results]
```

If any ecosystem had security vulnerabilities, highlight them at the top of the report.
