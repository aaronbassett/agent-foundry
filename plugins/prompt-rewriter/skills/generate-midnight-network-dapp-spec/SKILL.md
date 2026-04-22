---
name: prompt-rewriter:generate-midnight-network-dapp-spec
description: Use this skill to generate a Midnight Network DApp spec brief through an adaptive Q&A. The output is a concise brief (not a full spec) intended as input to a downstream spec / planning skill such as /superpowers:brainstorming or /sdd:specify. Triggers on "generate midnight dapp spec", "improve midnight dapp prompt", "midnight dapp brief", "midnight dapp prompt", or /prompt-rewriter:midnight-dapp-spec.
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

Create a todo for each item via `TodoWrite` and complete in order:

1. Intake — discover any existing DESIGN.md
2. Use-case — Educational / PoC / MVP
3. Core concept — one-line description + audience
4. Value movement (Phase 3) — how / whether the DApp moves value
5. Privacy direction (Phase 3a) — inferred private/public items
6. Interfaces — Web UI / CLI / TUI / Headless
7. Design system (only if Web UI or TUI) — reuse, full flow, or brief
8. Developer-experience priorities (Educational / PoC only)
9. Networks — always asked
10. Out of scope
11. Render and return the brief

## References

Read each reference only when its phase is entered:

- `references/use-case-defaults.md` — Phase 1 / 6 / 7 branching rules; also seeds Phase 3a privacy inference.
- `references/privacy-goals.md` — Phase 3a inference and fallback list.
- `references/interface-defaults.md` — Phase 3a privacy-item hints per interface.
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

## Phase 1 — Use-case

Read `references/use-case-defaults.md` before asking.

```text
AskUserQuestion(
  question: "Which best describes the kind of Midnight DApp you're building?",
  header: "Use-case",
  options:
    - label: "Educational example"
      description: "Learning resource — zero-config, demo-oriented, local-devnet first. Not aimed at production users."
    - label: "Proof of Concept (PoC)"
      description: "Internal or technical validation of an idea. Real users not yet in scope."
    - label: "MVP"
      description: "First shippable slice. Real users in scope; deployment story matters."
)
```

Record the answer. It gates Phase 6 (skipped for MVP) and Phase 7
(Educational treats local as implicit).

## Phase 2 — Core concept

Ask two questions in sequence.

### Q2a — One-line description

```text
AskUserQuestion(
  question: "In one sentence, what does this DApp do?",
  header: "Concept",
  options:
    - label: "It's <X> for <audience> that does <Y>"
      description: "Product framing: who uses it, what it does for them."
    - label: "It solves <problem> by <approach>"
      description: "Problem/solution framing: what problem, what is the private mechanism."
    - label: "I'll describe it freely"
      description: "Free-form via Other."
)
```

Accept free-form text via Other when the seeded framings don't fit.
Store the one-line description verbatim — it seeds the `Summary`
section of the brief.

### Q2b — Audience

```text
AskUserQuestion(
  question: "Who is this DApp for?",
  header: "Audience",
  options:
    - label: "Developers learning Midnight"
      description: "The DApp exists to teach. (Most common in Educational use-cases.)"
    - label: "A specific user group"
      description: "End users outside the dev audience — e.g., DAO members, event attendees, researchers."
    - label: "An internal team"
      description: "Validating an idea for internal stakeholders — PoC / MVP flavour."
)
```

Record the answer. Feeds Phase 3a's privacy-item inference.

## Phase 3 — Value movement

```text
AskUserQuestion(
  question: "Does this DApp move value between parties?",
  header: "Value movement",
  options:
    - label: "No value movement"
      description: "Informational / gated logic / ZK proofs only."
    - label: "NIGHT transfers"
      description: "Moves the public, fixed-supply NIGHT token. Balances and transfers observable on-chain."
    - label: "Custom shielded token"
      description: "DApp mints / manages its own Zswap-shielded token. Balances and transfers private."
    - label: "Custom unshielded token"
      description: "DApp mints / manages its own public token. Balances observable."
    - label: "Shielded unique assets"
      description: "NFT-style unique items via Zswap."
    - label: "Multiple kinds"
      description: "A mix of the above."
)
```

If the user picked "Multiple kinds," follow up with a **multi-select**
across the same four concrete options (excluding "No value movement"
and "Multiple kinds").

**Do not** ask a balance-privacy follow-up — privacy is implicit in the
chosen option (shielded vs unshielded).

**Do not** mention DUST as a DApp-level privacy item in later phases.
DUST is a non-transferable fee resource auto-generated from NIGHT; it
is not a user-transferable asset.

## Phase 3a — Privacy direction

Read `references/privacy-goals.md`, `references/interface-defaults.md`, and the "Inference hints for Phase 3a" section of `references/use-case-defaults.md`.

1. **Infer candidate items.** Using Phase 2 (concept + audience),
   Phase 3 (value movement), and interface hints, produce a list of
   4–10 concrete data items likely present in this DApp. Follow the
   inference heuristics in `privacy-goals.md`.

2. **Fallback if inference under-produces.** If the list has fewer
   than 4 items, merge in items from the generic fallback list in
   `privacy-goals.md`.

3. **Ask per item.** For each candidate item, ask one
   `AskUserQuestion` with options:

   ```text
   - label: "Likely private"
     description: "The DApp should keep this hidden from observers."
   - label: "Likely public"
     description: "Observable or deliberately disclosed."
   - label: "Undecided / depends on design"
     description: "The spec skill should explore this further."
   - label: "Doesn't apply"
     description: "Not relevant to this DApp."
   ```

   For speed, group related items (e.g., identity / actions /
   aggregates) and issue one multi-select `AskUserQuestion` per group
   where the items clearly share a category.

4. **Store buckets.** Record items as three lists: `likely_private`,
   `likely_public`, `undecided`. Drop items marked "Doesn't apply".

**Never use** Compact vocabulary in the questions. Say "individual
donation amounts", not "committed donation leaves".

## Phase 4 — Interfaces

Read `references/interface-defaults.md`.

```text
AskUserQuestion(
  question: "Which interfaces should this DApp expose? (Select all that apply.)",
  header: "Interfaces",
  multiSelect: true,
  options:
    - label: "Web UI"
      description: "Browser-based interface for end users."
    - label: "CLI"
      description: "Terminal command-line tool."
    - label: "TUI"
      description: "Full-screen terminal interface."
    - label: "Headless / library"
      description: "No interface; contract + SDK wrapper consumed by other code."
)
```

**Do not ask per-interface framework or library questions.** Those
choices belong to the downstream spec. `interface-defaults.md` is used
only to enrich Phase 3a's privacy inference — not to probe stack
preferences.

Record the selection.

## Phase 5 — Design system

**Skip this phase entirely** if neither Web UI nor TUI was selected in
Phase 4.

Read `references/design-integration.md`.

### 5a — Reuse check

If Phase 0 found an existing DESIGN.md:

```text
AskUserQuestion(
  question: "I found an existing design system at <path>. How should I use it?",
  header: "Design reuse",
  options:
    - label: "Reuse it for this DApp"
      description: "Record the path in the brief; skip the design sub-flow."
    - label: "Start fresh"
      description: "Ignore the existing file and run a design sub-flow."
)
```

If the user picks reuse, record `reuse:<path>` and jump to the Web+TUI
reconciliation step (5c) if applicable, otherwise end Phase 5.

### 5b — Sub-flow choice (Web UI)

If no reuse:

```text
AskUserQuestion(
  question: "How should we establish the design direction for the Web UI?",
  header: "Design path",
  options:
    - label: "Full /design-systems flow"
      description: "Run /design-systems:create and /design-systems:specimen now, with sign-off on the specimen before we continue."
    - label: "Just capture an aesthetic brief"
      description: "Record a one-paragraph direction. No DESIGN.md is produced; the downstream spec can run /design-systems:create if it wants."
)
```

Run the chosen sub-flow per `references/design-integration.md`. Record
`generated` (full flow produced DESIGN.md) or `brief:"<text>"`.

### 5c — TUI reconciliation

Entered only if **both** Web UI and TUI were selected.

```text
AskUserQuestion(
  question: "Should the TUI share the Web UI's primary design elements (colour palette, type hierarchy), or have a distinct identity?",
  header: "TUI design",
  options:
    - label: "Share Web UI primaries"
      description: "Write a thin TUI_DESIGN.md that references DESIGN.md and notes terminal adaptations."
    - label: "Distinct identity"
      description: "Run a separate design sub-flow for the TUI with the TUI-aware prefix prepended to the brief."
)
```

If shared and the Web UI's design was `reuse` or `generated` (i.e.,
there is a DESIGN.md on disk), write `TUI_DESIGN.md` using the template
in `design-integration.md`.

If shared but the Web UI was `brief:` only, record `brief:<text>` for
TUI too with the terminal prefix applied in the render phase.

If distinct, repeat the appropriate 5b sub-flow for the TUI with the
TUI-aware prefix from `design-integration.md`.

### 5d — TUI without Web UI (edge case)

If TUI was selected but Web UI was not:

- Skip 5c.
- In 5b, when choosing "Full flow," prepend the TUI-aware prefix to the
  aesthetic brief passed to `design-systems:create`. Write
  `TUI_DESIGN.md` to cwd (not `DESIGN.md`).
- When choosing "Brief only," capture the TUI-framed text verbatim.

Record `generated` (TUI_DESIGN.md written) or `brief:"<text>"`.

## Phase 6 — Developer-experience priorities

**Skip this phase entirely** if Use-case is MVP.

Ask a single multi-select `AskUserQuestion` with defaults all pre-checked:

```text
AskUserQuestion(
  question: "Which developer-experience priorities should the brief carry? (All default to yes.)",
  header: "Dev-XP",
  multiSelect: true,
  options:
    - label: "Zero-config onboarding"
      description: "A newcomer should be able to run the project end-to-end with minimal setup."
    - label: "Automated test-wallet setup"
      description: "Demos and tests don't require manual wallet creation or funding."
    - label: "Local-network auto-provision or detect"
      description: "Automatic provisioning or detection of a local Midnight network for local development."
)
```

Record selected items. The rendered brief only shows bullets the user
selected. Bullets are phrased as *priorities*, not implementation
filenames.

## Phase 7 — Networks

Always asked, regardless of use-case.

### Educational branch

```text
AskUserQuestion(
  question: "Local devnet is pre-included for Educational examples. Should the brief *additionally* target any other networks?",
  header: "Networks",
  multiSelect: true,
  options:
    - label: "Preview network"
      description: "The public preview testnet."
    - label: "Preprod network"
      description: "The pre-production testnet."
)
```

Record `[local]` plus any additions. Even "local only" is explicitly
recorded.

### PoC / MVP branch

```text
AskUserQuestion(
  question: "Which networks should the DApp be able to run against? (Select all that apply.)",
  header: "Networks",
  multiSelect: true,
  options:
    - label: "Local devnet"
      description: "Docker-compose local network for development."
    - label: "Preview network"
      description: "Public preview testnet."
    - label: "Preprod network"
      description: "Pre-production testnet."
    - label: "Mainnet"
      description: "Production Midnight mainnet."
)
```

If the user deselects local devnet, re-prompt once to confirm (local
is nearly always wanted for development). Record the final selection.

## Phase 8 — Out of scope

```text
AskUserQuestion(
  question: "Anything you want to explicitly exclude from scope? (Plain English. 'None' is fine.)",
  header: "Out of scope",
  options:
    - label: "None"
      description: "No explicit exclusions — the downstream spec decides what's in scope."
    - label: "I'll list a few items"
      description: "Free text via Other."
)
```

Accept free-form text via Other. Store the answer. Empty / "None" /
skip → the rendered brief says `No explicit exclusions captured.`

## Phase 9 — Render

Read `references/output-template.md` and follow its framing rules
strictly.

### Steps

1. **Choose a name.** Derive a 2–4 word Title Case name from Phase 2's
   one-line description (e.g., "Anonymous Donations Portal"). If the
   inferred name is longer than 4 words, confirm via
   `AskUserQuestion` with 2–3 shorter alternatives + Other.

2. **Assemble the brief in memory** following the exact section order
   in `output-template.md`:

   | Section | Source |
   |---|---|
   | Summary | Phase 2a verbatim |
   | Use-case | Phase 1 label + short rationale combining Phase 2b audience |
   | What it does | Narrative 3–6 sentences expanded from Phase 2a + 2b |
   | Privacy direction | Phase 3a buckets, with the preamble from `output-template.md` |
   | Value movement | Phase 3 (omit section entirely if "No value movement") |
   | Interfaces | Phase 4 selections, plain-language bullets |
   | Design direction | Phase 5 record (omit section if Phase 5 was skipped) |
   | Networks | Phase 7 selections |
   | Developer-experience priorities | Phase 6 selections (omit section if MVP) |
   | Out of scope | Phase 8 answer |

3. **Apply the framing rules** from `output-template.md`:
   - No stack names.
   - No implementation filenames.
   - No fee / DUST commentary.
   - No hand-off section.
   - Omit unselected-branch sections entirely.

4. **Return the brief inline as markdown.** Do not wrap the whole brief in a fenced code block — it should render as formatted markdown in the user's view so they can read and copy it directly.

5. **After returning**, tell the user:

   > "The brief is above. You can paste it into `/superpowers:brainstorming`,
   > `/sdd:specify`, or any spec/planning skill. Let me know if you'd
   > like me to save it to disk somewhere."

   If the user asks to save, write to the requested path. Default is `./dapp-brief.md` if they don't specify and want to save. Do not auto-save without being asked. If the user provides a save path outside the current working directory, confirm before writing.

### Final verification checklist (mental, run before returning)

- [ ] No "React", "Vite", "commander", "ink", "yargs", "clack" or other
  framework/library names anywhere in the brief.
- [ ] No `./scripts/`, no `package.json`, no `src/` paths.
- [ ] No "DUST" mentioned outside `references/*` (which are not in the
  brief).
- [ ] Privacy section has the "initial thoughts" preamble.
- [ ] Value-movement ends with a deferral phrase ("for the spec to
  determine" or equivalent) unless omitted.
- [ ] No "N/A" sections. Unused sections omitted entirely.
