---
name: supply-chain-defence:doctor
description: "Diagnose whether the supply chain defence toolchain is ready. Checks for required tools (Socket.dev, lockfile-lint, Node.js) and plugin script sync status. Use --auto-fix to automatically install missing tools."
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
  - Skill
argument-hint: "[--auto-fix]"
---

# Supply Chain Defence Doctor

Diagnose the supply chain defence toolchain. Focused on **tool availability**, not project configuration.

## Step 1: Parse Arguments

Check if `$ARGUMENTS` contains `--auto-fix`. Store as a boolean flag.

## Step 2: Run Doctor Checks

Run the check runner with the doctor profile:

```bash
node ${CLAUDE_PLUGIN_DATA}/scripts/runner.js --profile doctor
```

The runner outputs JSON with a `results` array. Each result has `status` (pass/warn/info) and `message`.

## Step 3: Present Results

Format results into three categories:

**Ready:**
- All checks with status `pass`

**Missing (fixable):**
- Socket.dev CLI not installed
- lockfile-lint not installed
- Scripts not synced

**Optional:**
- CycloneDX not installed
- jq not installed

Present as a table:

```
## Supply Chain Defence — Doctor Report

| Tool | Status | Notes |
|------|--------|-------|
| Node.js | PASS | v20.11.0 |
| Package Manager | PASS | pnpm (from pnpm-lock.yaml) |
| Socket.dev CLI | MISSING | Install: npm install -g @socketsecurity/cli |
| lockfile-lint | PASS | v5.0.0 |
| CycloneDX | OPTIONAL | Not installed (SBOM generation) |
| jq | OPTIONAL | Not installed |
| Script Sync | PASS | version 0.1.0 |
```

## Step 4: Remediation

**If `--auto-fix`:** Invoke `supply-chain-defence:setup` skill to install all missing required tools automatically.

**If no `--auto-fix`:** Ask the user which missing tools they'd like to install:

> "Found N missing tools. Would you like to install them? I can run /supply-chain-defence:setup to fix these, or you can choose which to install."

If the user agrees, invoke the `supply-chain-defence:setup` skill.
