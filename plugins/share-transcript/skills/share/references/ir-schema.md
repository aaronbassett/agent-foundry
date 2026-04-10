# IR (Intermediate Representation) JSON Schema

The parser produces a single IR object that flows through the pipeline: section filtering, redaction, and rendering.

## Top-Level Structure

```json
{
  "metadata": { ... },
  "redactionConfig": { ... },
  "sections": [ ... ],
  "subagents": [ ... ]
}
```

## `metadata`

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique identifier for the session (from the JSONL filename) |
| `sessionName` | string | Human-readable session name |
| `project` | string | Project directory path |
| `gitBranch` | string \| null | Active git branch at session start |
| `startTime` | string (ISO 8601) | Timestamp of the first message |
| `endTime` | string (ISO 8601) | Timestamp of the last message |
| `claudeVersion` | string | Claude Code CLI version |
| `model` | string | Model ID used in the session |
| `totalUserMessages` | number | Count of user messages |
| `totalAssistantMessages` | number | Count of assistant messages |

## `redactionConfig`

Populated by the redactor. Records which transforms were applied. Structure mirrors the redaction preset options — see `redaction-tiers.md`.

## `sections`

Array of section objects. A new section begins on each string-content user message (i.e. a user turn whose `content` is a plain string, not a tool result). Tool-result user messages are grouped into the current section.

```json
[
  {
    "index": 0,
    "included": true,
    "messages": [ ... ]
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | Zero-based section index |
| `included` | boolean | Whether this section appears in the output. Defaults to `true`. Set to `false` during section filtering to exclude it. |
| `messages` | array | Ordered list of messages in this section |

### Section grouping rule

- Walk the JSONL entries in order.
- When a user message with string `content` is encountered, start a new section.
- Subsequent tool-result user messages and assistant messages belong to the current section.
- The first string-content user message opens section 0.

## Message types in `sections[].messages`

### User message

```json
{
  "id": "msg_01...",
  "type": "user",
  "content": "string | array",
  "timestamp": "2025-01-15T10:23:00.000Z",
  "gitBranch": "main"
}
```

`content` is a plain string for conversational turns, or an array of content blocks for tool results.

### Assistant message

```json
{
  "id": "msg_02...",
  "type": "assistant",
  "textContent": "The response text...",
  "toolCalls": [ ... ],
  "timestamp": "2025-01-15T10:23:05.000Z",
  "model": "claude-opus-4-5"
}
```

## `toolCalls`

Each element of `toolCalls` on an assistant message:

```json
{
  "id": "toolu_01...",
  "name": "Bash",
  "input": { "command": "ls -la" },
  "result": "total 42\n...",
  "subagentId": "agent-abc123",
  "subagentSessionFile": "~/.claude/projects/.../session.jsonl"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Tool call ID from the JSONL |
| `name` | string | Tool name (e.g. `Bash`, `Read`, `Agent`) |
| `input` | object \| null | The tool input parameters. Set to `null` by "names-only" redaction. |
| `result` | string \| null | The tool result text. Set to `null` by "strip" redaction; set to `[Tool output — summary needed]` by "summary-only". |
| `subagentId` | string \| null | If this call spawned a subagent, the subagent's ID. Otherwise null. |
| `subagentSessionFile` | string \| null | Path to the subagent's JSONL session file. Otherwise null. |

## `subagents`

Array of subagent objects discovered during parsing. Only present when the session contains `Agent` tool calls that reference separate JSONL files.

```json
[
  {
    "id": "agent-abc123",
    "calledFrom": "toolu_01...",
    "description": "Investigate test failures in the auth module",
    "handling": null,
    "sessionFile": "~/.claude/projects/.../subagent-session.jsonl",
    "conversation": [ ... ]
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique subagent identifier |
| `calledFrom` | string | Tool call ID that spawned this subagent |
| `description` | string | Description extracted from the Agent tool input |
| `handling` | `"include"` \| `"exclude"` \| `"separate"` \| null | How to handle this subagent in output. Defaults to `null` — user chooses during the Q&A flow. |
| `sessionFile` | string | Absolute path to the subagent's JSONL file |
| `conversation` | array | The parsed messages from the subagent session, using the same message structure as `sections[].messages` |

## Notes

- `included` on sections defaults to `true`. The section-filtering step sets it to `false` for excluded sections.
- `handling` on subagents defaults to `null`. The subagent handling step (Step 6) sets it before the pipeline runs.
- The redactor and renderer both respect `included=false` and skip those sections.
- Section indices are stable — they are set by the parser and never renumbered.
