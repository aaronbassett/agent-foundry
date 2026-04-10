# Session Finder Flow

## Initial Options

When the user has not supplied a session, present four choices via AskUserQuestion:

1. **Current session** — use the sessionId from the active conversation's JSONL
2. **Supply ID or name** — user types a session ID or name to resolve directly
3. **Browse recent** — page through recent sessions 3 at a time
4. **Search** — describe what they're looking for; find matching sessions

## Option 1: Current Session

Use the sessionId from the current conversation. No additional input required.

## Option 2: Supply ID or Name

Ask the user for the ID or name. Resolve it:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/session-finder.js --resolve <id-or-name> --claude-projects-dir ~/.claude/projects
```

If found, confirm the session name and dates with the user before proceeding. If not found, offer to fall back to browse or search.

## Option 3: Browse Recent

### Browse Flow

Show 3 sessions at a time. For each session display:
- Session name
- Start date and last activity date
- First user message (as a short summary of what the session was about)

After showing 3 sessions, ask: "Do any of these match? (yes / show more / search instead)"

- **Yes** — user picks one; proceed with that session.
- **Show more** — show the next 3 sessions. After every 3 pages (9 sessions shown), re-offer the search option before continuing.
- **Search instead** — transition to the Search flow.

Sessions already shown and rejected are never shown again in the same browse flow (exclusion tracking applies).

If there are no more sessions to show, offer to start a new search.

## Option 4: Search

### Search Flow

1. Ask the user to describe what they're looking for (e.g. "the session where I fixed the auth bug" or "transcript about React performance").
2. Extract unique search terms from the description.
3. Grep for those terms across JSONL files in `~/.claude/projects/`:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/session-finder.js --search "<terms>" --claude-projects-dir ~/.claude/projects
```

### If results are manageable (a small set of candidates)

Review each candidate session and present them to the user in the same 3-at-a-time format as Browse. Apply exclusion tracking.

### If results are too many to review directly

Fan out to subagents. Each subagent:
- Receives a batch of JSONL file paths
- Reads the full transcripts
- Returns a relevance assessment with a short summary

Consolidate the subagent results and present the top matches to the user.

### If all candidates are exhausted

Offer the user two options:
1. **Restart with a new description** — reset the exclusion list and begin a fresh search with a different description.
2. **Browse instead** — switch to the Browse flow from the beginning.

## Exclusion Tracking

Throughout a single skill invocation, track which sessions have already been shown to the user and rejected. Sessions in the exclusion list are never surfaced again unless the user explicitly restarts the search (which clears the list).

Exclusion applies across both Browse and Search flows within the same run.

## Session Metadata Fields

Each session returned by `session-finder.js` includes:

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier (from JSONL filename) |
| `sessionName` | string | Human-readable session name |
| `filePath` | string | Absolute path to the session's JSONL file |
| `projectDir` | string | The project directory the session was run in |
| `startTime` | string (ISO 8601) | Timestamp of the first message |
| `lastActivity` | string (ISO 8601) | Timestamp of the most recent message |
| `firstUserMessage` | string | Text of the first user message (truncated) |
| `gitBranch` | string \| null | Git branch active at session start |
