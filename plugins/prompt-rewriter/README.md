# Prompt Rewriter Plugin

Skills for rewriting, generating, and structuring prompts. The first
(and currently only) skill produces a Midnight Network DApp spec brief
through an adaptive Q&A.

## Features

- **Adaptive Q&A** — skips irrelevant questions based on prior answers
  (e.g., no design questions if there is no Web UI or TUI).
- **Use-case aware** — Educational / PoC / MVP each change which
  questions are asked.
- **Design-systems integration** — optionally runs
  `/design-systems:create` and `/design-systems:specimen` when a Web UI
  or TUI is in scope, including a shared-identity path for Web + TUI.
- **Output is direction, not detail** — the rendered brief is designed
  to hand to a spec / planning skill (`/superpowers:brainstorming`,
  `/sdd:specify`). It deliberately avoids locking in stack or
  implementation choices.

## Skill

### generate-midnight-network-dapp-spec

Walks through an adaptive multi-step Q&A covering use-case, core
concept, privacy direction, value movement, interfaces, design
direction, developer-experience priorities, networks, and out-of-scope
items. The rendered brief is returned inline — not written to disk
unless the user asks.

**Trigger phrases:** "generate midnight dapp spec", "new midnight
dapp", "midnight dapp brief", "midnight dapp prompt",
`/prompt-rewriter:midnight-dapp-spec`.

## Command

### /prompt-rewriter:midnight-dapp-spec

Thin wrapper that invokes the skill with no arguments. The skill runs
the full Q&A every time.

## Typical workflow

```
$ /prompt-rewriter:midnight-dapp-spec
  → adaptive Q&A
  → brief printed inline
$ (paste brief into) /superpowers:brainstorming
  or
$ (paste brief into) /sdd:specify
```

## Design philosophy

- The brief is a **seed** for downstream work, not a spec.
- It carries direction and constraints (privacy, networks) but no
  implementation details (frameworks, file paths, scripts).
- Framing phrases like "initial thoughts", "likely private", "for the
  spec to determine" are baked into the template so the downstream skill
  has room to make its own decisions.

## References

- Design spec: `docs/superpowers/specs/2026-04-22-prompt-rewriter-plugin-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-22-prompt-rewriter-plugin.md`
