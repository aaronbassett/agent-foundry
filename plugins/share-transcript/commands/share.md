---
name: share-transcript:share
description: "Convert a Claude Code session transcript into a shareable Markdown or HTML file with interactive session selection, section filtering, tiered redaction, and themed rendering."
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
  - Agent
  - Glob
  - Grep
  - Skill
argument-hint: "[--preset <name>]"
---

Invoke the share-transcript:share skill to begin the interactive transcript sharing workflow.

If the user provided `--preset <name>` as an argument, pass that preset name to the skill's preference loading step.
