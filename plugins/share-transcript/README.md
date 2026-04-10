# share-transcript

Convert Claude Code session transcripts (JSONL) into shareable Markdown or HTML files with interactive session selection, section filtering, tiered redaction, and themed rendering.

## Usage

```bash
/share-transcript:share
/share-transcript:share --preset team-share
```

The command walks you through an interactive flow:

1. **Preferences** — load a saved preset or start fresh
2. **Session selection** — current session, browse recent, search, or supply an ID
3. **Section selection** — whole transcript or filter by prompts, time, actions, topics, or git branch
4. **Redaction** — pick a tier (none/light/medium/heavy/conversation-only), optionally toggle individual transforms
5. **Format & theme** — Markdown or HTML with 5 built-in themes or custom CSS
6. **Subagent handling** — include inline, exclude, or generate separate files
7. **Processing** — parse, redact, render
8. **Wrap-up** — output path shown, option to save preferences as a named preset

## Architecture

Hybrid approach: deterministic Node.js scripts handle parsing, redaction, and rendering. Claude handles the interactive Q&A, semantic session search, action-based section matching, and custom theme generation.

```
Slash Command (Q&A flow via Claude + AskUserQuestion)
  │
  ├── parser.js          JSONL → Intermediate Representation
  ├── session-finder.js  List, resolve, grep across sessions
  ├── section-analyzer.js  Extract timeline of events
  ├── redactor.js        Apply redaction transforms to IR
  ├── renderer.js        IR → self-contained HTML or Markdown
  ├── prefs-manager.js   Named presets + last-used persistence
  └── theme-manager.js   Built-in + custom theme management
```

All scripts use Node.js stdlib only (no external dependencies).

## Redaction Tiers

| Preset | PII | Secrets | Paths | Hook Noise | Tool Inputs | Tool Outputs | Code |
|--------|-----|---------|-------|------------|-------------|-------------|------|
| none | keep | keep | keep | keep | keep | keep | keep |
| light | strip | strip | keep | keep | keep | keep | keep |
| medium | strip | strip | relativize | strip | keep | keep | keep |
| heavy | strip | strip | relativize | strip | names only | summary only | strip |
| conversation-only | strip | strip | strip | strip | strip | strip | strip |

Secret detection covers: API keys (OpenAI, GitHub, AWS), Bearer/JWT tokens, BIP-39 seed phrases, hex private keys, connection strings, and `.env`-style values.

## Themes

Five built-in HTML themes, all with automatic light/dark mode:

| Theme | Style |
|-------|-------|
| `minimal` | Clean sans-serif, generous whitespace, GitHub-markdown feel |
| `chat-clean` | Alternating left/right blocks, clear speaker labels |
| `chat-bubbles` | Rounded bubbles, avatars, softer palette |
| `tech-docs` | Documentation feel, numbered sections, monospace-heavy |
| `blueprint` | Grid background, technical font, engineering-drawing aesthetic |

Custom themes can be generated from a DESIGN.md or text description.

## HTML Output Features

- Fully self-contained (single file, works offline except Google Fonts)
- Light/dark mode via `prefers-color-scheme`, defaults to dark
- Progressive disclosure: tool calls collapsed by default, expand on click
- Fixed header with controls: expand/collapse all, filter by type, hide subagents, search
- Syntax-highlighted code blocks

## Session Selection

Four ways to find the session you want:

1. **Current session** — share what you're working on right now
2. **By ID or name** — direct lookup if you know the session
3. **Browse recent** — paginated list with names, dates, and summaries
4. **Search** — describe what you're looking for; grep first, then semantic search via subagents

## Section Selection

Six ways to select which parts to share:

1. **Last N prompts** — most recent N user turns
2. **Before/after/between prompts** — reference by number or description
3. **Before/after/between datetime** — time-based filtering
4. **Before/after/between actions** — "after the PR", "between the commit and the reset"
5. **Summary-based** — Claude summarizes topics, you pick which to include
6. **By git branch** — include only messages from specific branches

## Data Storage

```
${CLAUDE_PLUGIN_DATA}/.share-transcript/
├── presets/
│   ├── last-used.json
│   └── named/
├── custom-themes/
└── exports/
    └── {session-id}/
        └── {name}.{html|md}
```
