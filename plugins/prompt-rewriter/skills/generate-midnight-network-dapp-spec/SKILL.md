---
name: prompt-rewriter:generate-midnight-network-dapp-spec
description: Use this skill to generate a Midnight Network DApp spec brief through an adaptive Q&A. The output is a concise brief (not a full spec) intended as input to a downstream spec / planning skill such as /superpowers:brainstorming or /sdd:specify. Triggers on "generate midnight dapp spec", "new midnight dapp", "midnight dapp brief", "midnight dapp prompt", or /prompt-rewriter:midnight-dapp-spec.
---

# Generate Midnight Network DApp Spec Brief

## Overview

Walk the user through an adaptive, multi-step Q&A and produce a short
markdown brief that describes a Midnight Network DApp at enough depth
to seed a spec/planning skill but without locking in implementation
details. The brief is returned inline in the chat; it is **not** written
to disk by default.

<HARD-GATE>
Do NOT write Compact contracts, TypeScript code, project scaffolding,
or implementation files. This skill collects direction and produces a
markdown brief. Implementation decisions happen downstream in
/superpowers:brainstorming, /sdd:specify, or similar.
</HARD-GATE>

## When to Use

- User wants to generate a Midnight DApp spec from scratch.
- User typed `/prompt-rewriter:midnight-dapp-spec`.
- User says things like "I want to build a Midnight DApp for X — help me
  write the spec brief."

## When NOT to Use

- User already has a detailed spec and wants to *implement* it. Use an
  implementation-focused skill instead.
- User wants to write prompts for non-Midnight ecosystems. This skill is
  Midnight-specific.

## Checklist

Create a task for each item via `TaskCreate` and complete in order:

1. Intake — discover any existing DESIGN.md
2. Use-case — Educational / PoC / MVP
3. Core concept — one-line description + audience
4. Value movement (Phase 3a) — how / whether the DApp moves value
5. Privacy direction (Phase 3) — inferred private/public items
6. Interfaces — Web UI / CLI / TUI / Headless
7. Design system (only if Web UI or TUI) — reuse, full flow, or brief
8. Developer-experience priorities (Educational / PoC only)
9. Networks — always asked
10. Out of scope
11. Render and return the brief

## References

Read each reference only when its phase is entered:

- `references/use-case-defaults.md` — Phase 1 / 6 / 7 branching rules.
- `references/privacy-goals.md` — Phase 3 inference and fallback list.
- `references/interface-defaults.md` — Phase 3 / 4 supplemental hints.
- `references/design-integration.md` — Phase 5 design sub-flows.
- `references/output-template.md` — Phase 9 render template.

## Phase 0 — Intake

No user-facing prompting. Do this silently:

```bash
ls ./DESIGN.md ./docs/DESIGN.md 2>/dev/null
ls ./TUI_DESIGN.md ./docs/TUI_DESIGN.md 2>/dev/null
```

Record any hits. They become reuse candidates in Phase 5.

Announce the start of the flow:

> "I'll ask a series of questions about the Midnight DApp you want to
> spec out. We'll work through use-case, concept, privacy, interfaces,
> networks, and (if UI is involved) design direction. The end result is
> a concise brief you can hand to a spec/planning skill."
