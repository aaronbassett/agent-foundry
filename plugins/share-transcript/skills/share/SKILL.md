---
name: share-transcript:share
description: >-
  This skill should be used when the user asks to "share a transcript",
  "export a session", "convert a transcript", "share this conversation",
  "create a shareable transcript", "export to HTML", "export to markdown",
  or mentions sharing Claude Code sessions with others.
---

# Share Transcript

Convert a Claude Code session transcript into a shareable Markdown or HTML file. This skill uses a hybrid architecture: deterministic scripts handle parsing, redaction, and rendering; Claude handles inference tasks such as session search, section matching, and theme generation.

## Overview

The skill runs an 8-step interactive Q&A flow, then pipes the session JSONL through a three-stage processing pipeline:

1. **parser.js** — Converts the raw JSONL into the IR (Intermediate Representation). See `references/ir-schema.md`.
2. **redactor.js** — Applies redaction transforms to the IR based on the chosen tier. See `references/redaction-tiers.md`.
3. **renderer.js** — Renders the redacted IR to Markdown or HTML using a named theme.

## Script and Path Locations

- **Scripts**: `${CLAUDE_SKILL_DIR}/scripts/`
- **Templates**: `${CLAUDE_SKILL_DIR}/templates/`
- **Data, exports, and presets**: `${CLAUDE_PLUGIN_DATA}/.share-transcript/`

## Allowed Tools

Bash, Read, AskUserQuestion, Agent, Glob, Grep

---

## Step 1: Preferences

Check whether the user supplied a `--preset <name>` argument.

**If a preset name was supplied**, load it:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/prefs-manager.js get-preset \
  --data-dir ${CLAUDE_PLUGIN_DATA}/.share-transcript \
  --name <preset-name>
```

If the preset exists, show its settings and ask if the user wants to make any edits before proceeding. Skip the full Q&A for any settings covered by the preset (redaction, format, theme, subagent handling).

**If no preset was supplied**, check for last-used settings:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/prefs-manager.js get-last \
  --data-dir ${CLAUDE_PLUGIN_DATA}/.share-transcript
```

- If last-used references a named preset: ask "Do you want to use `<preset-name>` again?"
- If last-used contains custom (non-preset) settings: ask "Use the same preferences as last time?"

Show the settings and allow edits. If the user edits a named preset's settings, ask whether to: update the existing preset / save as a new preset / use for this session only.

**If no last-used settings exist**, proceed to the full Q&A (Steps 4–6).

---

## Step 2: Session Selection

If a session was not supplied as an argument, use AskUserQuestion to present four options:

1. Current session
2. Supply an ID or name
3. Browse recent sessions
4. Search for a session

**Current session**: Use the `sessionId` from the current conversation's JSONL file.

**Supply ID or name**: Resolve it with:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/session-finder.js \
  --resolve <id-or-name> \
  --claude-projects-dir ~/.claude/projects
```

**Browse or search**: Follow the full flow described in `${CLAUDE_SKILL_DIR}/references/session-finder.md`. Run `session-finder.js` with the appropriate flags (`--browse` or `--search "<terms>"`).

---

## Step 3: Section Selection

This step is always asked. It is not stored in or skipped by presets, because section selection is always specific to the session being exported.

Ask: "Do you want to share the whole transcript?"

- **Yes** — all sections included; proceed to Step 4.
- **No** — show six selection modes via AskUserQuestion:
  1. Last N prompts
  2. Before / after / between specific prompts (by prompt text or number)
  3. Date/time range
  4. Action-based (describe what was happening)
  5. Summary-based (show topic summaries and pick)
  6. Git branch

First, run the section analyzer to get the session timeline:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/section-analyzer.js <session-file-path>
```

This returns a structured timeline of sections with timestamps, prompt previews, git branches, and event markers.

**For action-based selection**: Claude reads the timeline and matches the user's natural-language description to the most relevant sections. Show the matches and confirm with the user.

**For summary-based selection**: Claude reads the full IR (output of parser.js on the session file) and generates a short topic summary for each section. Present the summaries and let the user pick which to include.

After confirming which sections to include, mark the rest as `included: false` in the IR before passing it to the redactor.

---

## Step 4: Redaction

Skip this step if settings are being loaded from a preset.

Show the redaction tier table from `${CLAUDE_SKILL_DIR}/references/redaction-tiers.md`.

Ask the user to choose a preset tier: `none`, `light`, `medium`, `heavy`, or `conversation-only`.

After they choose, ask: "Want to make any edits to the individual settings?" If yes, show each toggle:

- PII: keep / strip
- Secrets: keep / strip
- Absolute paths: keep / relativize / strip
- Hook/system noise: keep / strip
- Tool inputs: keep / names-only / strip
- Tool outputs: keep / summary-only / strip
- Code blocks: keep / strip

Record the final combination (preset + any overrides) for use in Step 7.

---

## Step 5: Format and Theme

Skip this step if settings are being loaded from a preset.

Ask: "What format do you want? Markdown or HTML?"

**If Markdown**: No theme selection required. Output will use the markdown template.

**If HTML**: List available themes. Run both:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/theme-manager.js list-builtin \
  --templates-dir ${CLAUDE_SKILL_DIR}/templates
```

```bash
node ${CLAUDE_SKILL_DIR}/scripts/theme-manager.js list-custom \
  --data-dir ${CLAUDE_PLUGIN_DATA}/.share-transcript
```

Present the combined list of built-in and custom themes. Also offer a "Create a new theme" option.

**Custom theme generation flow**:
1. Read `${CLAUDE_SKILL_DIR}/templates/base.html` to understand the HTML structure and CSS classes.
2. Read one or two existing theme CSS files for reference style.
3. Ask the user to describe the look they want (colors, font style, density, mood).
4. Generate new CSS as a complete theme file.
5. Ask for a theme name.
6. Save it:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/theme-manager.js save-custom \
  --data-dir ${CLAUDE_PLUGIN_DATA}/.share-transcript \
  --name <theme-name> \
  --css '<css-content>'
```

---

## Step 6: Subagent Handling

Skip this step if settings are being loaded from a preset, or if the session contains no subagents.

The parser will have identified any subagents in the IR. For each subagent, ask how to handle it:

- **Include inline** — subagent conversation embedded in the output at the call site
- **Exclude** — subagent omitted entirely
- **Separate file** — subagent exported as its own file alongside the main transcript

Set the `handling` field on each subagent in the IR accordingly before processing.

---

## Step 7: Processing

Run the three-stage pipeline.

### Stage 1: Parse

```bash
node ${CLAUDE_SKILL_DIR}/scripts/parser.js <session-file-path>
```

This outputs the IR as JSON to stdout.

Apply section filtering: set `included: false` on any sections the user excluded in Step 3.

Set `handling` on subagents as decided in Step 6.

### Stage 2: Redact

Pipe the IR to the redactor:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/redactor.js \
  --preset <preset> \
  --home-dir ~ \
  --project-root <cwd>
```

Pass individual toggle overrides as additional flags if the user customized beyond the preset (e.g. `--pii strip --code-blocks keep`).

**If tool outputs are set to `summary-only`**: After redaction, Claude reads the redacted IR and fills in a meaningful summary for each `[Tool output — summary needed]` placeholder. The summary should convey what the tool did and what it returned, without reproducing raw output. Write the summaries back into the IR before passing it to the renderer.

### Stage 3: Render

Pipe the redacted IR to the renderer:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/renderer.js \
  --format <markdown|html> \
  --theme <theme-name> \
  --templates-dir ${CLAUDE_SKILL_DIR}/templates \
  --output <output-path>
```

**Output path**: `${CLAUDE_PLUGIN_DATA}/.share-transcript/exports/<session-id>/<name>.<ext>`

Claude picks the `<name>` — make it descriptive and specific to the export, for example:
- `complete-transcript-no-redact`
- `auth-fix-branch-transcript`
- `last-5-prompts-heavy-redact`

For subagents with `handling: "separate"`, run the renderer again for each one with a matching output path: `<session-id>/<name>-subagent-<subagent-id>.<ext>`.

---

## Step 8: Wrap-up

Show the full absolute path(s) to the output file(s).

Ask: "Do you want to open the export directory?"

If yes:
```bash
open ${CLAUDE_PLUGIN_DATA}/.share-transcript/exports/<session-id>/
```

Save the current settings as last-used:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/prefs-manager.js save-last \
  --data-dir ${CLAUDE_PLUGIN_DATA}/.share-transcript \
  --config '<json-config>'
```

**Offer to save as a named preset** — but only if the settings were not loaded from an existing named preset without edits:

1. Generate a suggested preset name (e.g. `no-redact-html-blueprint`, `heavy-redact-md`).
2. Show the full settings.
3. Allow the user to edit the name or any settings.
4. Save:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/prefs-manager.js save-preset \
  --data-dir ${CLAUDE_PLUGIN_DATA}/.share-transcript \
  --name <preset-name> \
  --config '<json-config>'
```
