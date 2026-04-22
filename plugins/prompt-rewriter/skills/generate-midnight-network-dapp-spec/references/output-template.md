# Output Template — Midnight DApp Spec Brief

This file defines the exact shape of the rendered brief returned by
`SKILL.md`'s Phase 9. The SKILL reads this file before rendering.

## Framing rules (must hold in every rendered brief)

1. The brief is **direction-setting**, not a spec. The preamble of every
   non-trivial section tells the downstream skill that the contents are
   starting points, not hard requirements.
2. Sections for unselected branches are omitted entirely. Never render
   "N/A" or empty sections.
3. No stack names. "React + Vite", "commander", "ink" and any other
   framework or library choices never appear in the brief. Those choices
   belong to the downstream spec.
4. No implementation filenames. No `./scripts/demo.sh`, no `src/`, no
   `package.json` scripts. Use conceptual language.
5. No fee / DUST commentary. Fee UX is decided downstream.
6. No hand-off or "next step" section. The user decides what to do with
   the output.

## Exact template

```markdown
# Midnight DApp Spec Brief: <NAME>

## Summary

<one-line description collected in Phase 2>

## Use-case

<Educational example | PoC | MVP> — <short rationale: audience, why>

## What it does

<3–6 sentence narrative of the DApp's function and flow>

## Privacy direction

These are **initial thoughts** on what should be private vs. public —
examples of the data we expect to handle, not an exhaustive or fixed
list. The spec skill should pressure-test and refine them.

**Likely private:**
- <item>

**Likely public:**
- <item>

**Undecided / depends on design:**  <!-- only if user marked "either" -->
- <item with short note>

## Value movement   <!-- omitted if Phase 3 == "no value movement" -->

<Prose expansion of the Phase 3 selection. Ends with phrasing that
defers final mechanics, e.g. "Final token mechanics and transfer
semantics are for the spec to determine.">

## Interfaces

<Plain-language bullet per selected interface. No stack names.>

- Web UI — browser-based interface for end users.
- CLI — terminal command-line tool.
- TUI — full-screen terminal interface.
- Headless — no interface; contract + SDK wrapper consumed by other code.

## Design direction   <!-- only if Web UI or TUI selected -->

<One of:
- "A design system already exists at `<path>` and should be honoured."
- "A design system was generated and saved to `DESIGN.md` (and
  `TUI_DESIGN.md`). The spec should reference these files rather than
  redefining the aesthetic."
- "Aesthetic direction captured: `<verbatim brief>`. No DESIGN.md has
  been produced yet; the spec skill may run `/design-systems:create` if
  needed.">

## Networks

<Initial network targets — what the project should be able to run
against. Final deployment story is for the spec to decide.>

- Local devnet                    <!-- always present -->
- Preview network                 <!-- if selected -->
- Preprod network                 <!-- if selected -->
- Mainnet                         <!-- PoC/MVP and if selected -->

## Developer-experience priorities   <!-- Educational / PoC only -->

<Only bullets the user selected. Phrased as directions, not
implementation requirements.>

- Zero-config onboarding — a newcomer should be able to run the
  project end-to-end with minimal setup.
- Automated test-wallet setup so demos and tests don't require manual
  wallet creation or funding.
- Automatic provisioning or detection of a local Midnight network for
  local development.

## Out of scope

<Free-text from Phase 8, or "No explicit exclusions captured.">
```

## Render notes

- Replace `<NAME>` with a short, Title Case name derived from Phase 2's
  core concept (e.g. "Anonymous Donations Portal"). Ask the user for a
  confirmation if the inferred name is longer than 4 words.
- Keep bullets concise. Narrative sections (Summary, What it does, Value
  movement) should be plain English, not bulleted.
- If a user answer was unusually long, paraphrase into the template
  faithfully rather than pasting verbatim.
