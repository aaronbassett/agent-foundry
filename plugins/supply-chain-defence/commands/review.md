---
name: supply-chain-defence:review
description: "Deep dive security review of a specific npm package, project directory, package.json, or lockfile. Checks registry metadata, provenance, maintainer history, typosquatting risk, lifecycle scripts, and dependency tree."
allowed-tools:
  - Bash
  - Read
  - Glob
  - WebFetch
  - WebSearch
argument-hint: "<package-name|file-path|directory>"
---

# Supply Chain Defence Review

Deep security review of a package or project.

## Step 1: Parse Input

Determine what `$ARGUMENTS` refers to:

1. **Package name** (e.g., `lodash`, `@scope/pkg`) — no `/` prefix, no file extension, or starts with `@`
2. **File path** (e.g., `./package.json`, `./pnpm-lock.yaml`) — ends with `.json` or `.yaml` or `.lock`
3. **Directory** (e.g., `./packages/api/`) — path exists and is a directory

If no arguments provided, default to the current working directory.

## Step 2: For a Package Name

Run the review checks via the runner:

```bash
echo '{"tool_input":{"command":"npm install <package>"},"cwd":"<cwd>"}' | node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile review
```

Additionally, gather information using Bash commands:

### Registry Metadata
```bash
npm view <package> --json
```
Extract and report: version count, publish dates, latest version, license.

### Download Stats
```bash
npm view <package> --json
```
Check weekly downloads. Flag if very low (<100/week) or if there's a sudden recent spike.

### Provenance
```bash
npm audit signatures
```
Check if the package has npm provenance attestation.

### Maintainer Info
```bash
npm view <package> maintainers --json
```
Report maintainer count. Flag single-maintainer packages.

### Lifecycle Scripts
```bash
npm view <package> scripts --json
```
Flag `preinstall`, `postinstall`, `install`, `prepare` scripts.

### Dependency Tree
```bash
npm view <package> dependencies --json
```
Report direct dependency count. Flag unusually large trees.

### Socket.dev (if available)
```bash
socket npm info <package>
```

### npmscan.com
Search for the package on npmscan.com for malware indicators.

## Step 3: For a Directory or File

Read the `package.json` (directly or from the directory). Extract all dependency names from `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.

For each dependency, run the package review checks from Step 2.

Additionally run:
- `lockfile-lint` on the lockfile
- Dependency age analysis (flag anything published in last 5 days)
- Bulk typosquatting check

## Step 4: Present Report

Format as a structured report:

```
## Supply Chain Review: <target>

### Overview
- Package count: N
- Total transitive deps: M

### Risk Findings
- [HIGH] Package "X" has a single maintainer and 50M weekly downloads
- [WARN] Package "Y" was published 2 days ago
- [WARN] Package "Z" has postinstall script

### Typosquatting Check
- No suspects found / List suspects

### Provenance
- N/M packages have provenance attestation

### Recommendations
- Prioritised action list
```
