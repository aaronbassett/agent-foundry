---
name: generate
description: Design a new writing style through guided questioning and generate a writer skill + writing assistant (~20-25 min)
allowed-tools: ["Agent", "AskUserQuestion", "Read", "Write", "Bash", "Glob", "Skill"]
---

# /lexisim:generate

## Mode Requirement

This command requires execute mode. If plan mode is currently active, exit plan mode before proceeding. Use the ExitPlanMode tool, then continue with the command.

## Reference Files

These paths are resolved — read them directly, do not search or glob:

- **Question bank**: `!`echo ${CLAUDE_PLUGIN_ROOT}`/skills/lexisim/references/question-bank.md`
- **AI tells catalog**: `!`echo ${CLAUDE_PLUGIN_ROOT}`/skills/lexisim/references/ai-tells.md`
- **Reading level calibration**: `!`echo ${CLAUDE_PLUGIN_ROOT}`/skills/lexisim/references/reading-level-calibration.md`
- **Anti-voice catalog**: `!`echo ${CLAUDE_PLUGIN_ROOT}`/skills/lexisim/references/anti-voice-catalog.md`
- **Writer skill template**: `!`echo ${CLAUDE_PLUGIN_ROOT}`/skills/lexisim/assets/writer-skill-template.md`
- **Writer agent template**: `!`echo ${CLAUDE_PLUGIN_ROOT}`/skills/lexisim/assets/writer-agent-template.md`

## Workflow

Load skill `lexisim:lexisim` using the Skill tool.

Follow the full workflow defined in the skill, starting with Phase 1: Entry Path & Setup.
