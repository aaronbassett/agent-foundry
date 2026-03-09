---
name: generate
description: Design a new writing style through guided questioning and generate a writer skill + writing assistant (~20-25 min)
allowed-tools: ["Agent", "AskUserQuestion", "Read", "Write", "Bash", "Glob", "Skill"]
---

# /lexisim:generate

## Mode Requirement

This command requires execute mode. If plan mode is currently active, exit plan mode before proceeding. Use the ExitPlanMode tool, then continue with the command.

## Workflow

Load skill `lexisim:design` using the Skill tool. The skill resolves all reference file paths via `${CLAUDE_SKILL_DIR}`.

Follow the full workflow defined in the skill, starting with Phase 1: Entry Path & Setup.
