---
name: supply-chain-defence:audit
description: >-
  This skill should be used when the user asks to "audit dependencies",
  "run security audit", "check for vulnerabilities", "supply chain report",
  "security posture", "audit npm packages", "check dependency security",
  or "generate SBOM". Runs a comprehensive security posture report using
  npm audit, lockfile-lint, Socket.dev, and dependency age analysis.
  Cross-references devs:deps-core for package manager commands.
---

# Supply Chain Security Audit

Run a comprehensive security audit of the project's dependencies. This skill orchestrates multiple tools and presents a unified report.

## Prerequisites

Run `/supply-chain-defence:doctor` first to ensure required tools are installed.

## Detect Package Manager

Use the same lockfile detection as `devs:deps-core`:

| Lock file | Package manager |
|---|---|
| `pnpm-lock.yaml` | pnpm |
| `package-lock.json` | npm |
| `yarn.lock` | yarn |

## Audit Steps

### 1. npm/pnpm Audit

Run the appropriate audit command (refer to `devs:deps-core` for exact commands):

- npm: `npm audit --json`
- pnpm: `pnpm audit --json`
- yarn: `yarn npm audit --json`

Parse the JSON output and summarise vulnerabilities by severity (critical, high, moderate, low).

### 2. lockfile-lint

Run lockfile-lint validation:

```bash
npx lockfile-lint --path <lockfile> --type <pm> --allowed-hosts npm --validate-https
```

Report any failures (non-https sources, unexpected hosts).

### 3. Socket.dev Scan (if available)

If `socket` CLI is available, run:

```bash
socket report create --json
```

Summarise the risk findings.

### 4. Dependency Age Analysis

For each direct dependency in `package.json`, check the publish date of the installed version:

```bash
npm view <package>@<version> time --json
```

Flag any dependency where the installed version was published within the last 5 days.

### 5. Maintainer Analysis

For top-level dependencies, check maintainer count:

```bash
npm view <package> maintainers --json
```

Flag single-maintainer packages with high download counts as higher risk (these are prime targets for account takeover attacks like the Axios incident).

### 6. npmscan Vulnerability Cross-Check (MCP, if connected)

If the `npmscan` MCP server is available, call `batch_query_vulnerabilities` with all direct dependency names (up to 100 per call) to cross-reference OSV.dev — a second, independent source from npm's own advisory DB. Optionally call `get_latest_advisories` filtered to your dependencies' packages for recent GHSA entries.

This is advisory, third-party enrichment over a public endpoint (no auth, 30 req/min) — treat it as a supplementary signal, not a replacement for `npm audit`, and skip this step silently if the server isn't connected.

### 7. SBOM Generation (Optional)

If `@cyclonedx/cyclonedx-npm` is installed and the user wants an SBOM, offer to generate:

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

## Report Format

Present findings as a structured report:

```
## Supply Chain Security Report

### Vulnerabilities (npm audit)
- X critical, Y high, Z moderate

### Vulnerabilities (npmscan/OSV.dev cross-check)
- Additional findings not in npm audit, or "npmscan MCP not connected"

### Lockfile Integrity
- PASS/FAIL with details

### Socket.dev Findings
- Risk summary or "Socket CLI not available"

### Recently Published Dependencies
- List any deps published in last 5 days

### High-Risk Maintainer Patterns
- List single-maintainer packages with >100k weekly downloads

### Recommendations
- Prioritised list of actions
```
