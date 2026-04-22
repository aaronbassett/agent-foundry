# Design-Systems Integration

Read in Phase 5 only. Covers the full-flow sub-flow, brief-only
sub-flow, TUI handling, and error rules.

## Discovery

Performed at Phase 0. Check cwd and `./docs/`:

```bash
ls ./DESIGN.md ./docs/DESIGN.md 2>/dev/null
ls ./TUI_DESIGN.md ./docs/TUI_DESIGN.md 2>/dev/null
```

Record any hit as a reuse candidate. Do not walk further up the tree —
that can surface unrelated DESIGN.md files from a parent project.

## Full-flow sub-flow

When the user picks "run the full design-systems flow now":

1. **Collect direction.** One `AskUserQuestion` with 3–4 seeded
   aesthetic directions plus Other. Example options:
   - "Dark editorial — moody, magazine-inspired, serif-forward."
   - "Clean minimal — extreme reduction, one accent colour."
   - "Bold brutalist — hard edges, high contrast, raw structure."
   - "Warm organic — natural textures, warm palette."
2. **Invoke create.** `Skill(skill="design-systems:create")` with the
   collected direction as the brief. Wait for `DESIGN.md` to appear at
   cwd.
3. **Invoke specimen.** `Skill(skill="design-systems:specimen")`. Note
   the output HTML path it reports.
4. **Sign-off gate.** `AskUserQuestion`:
   - "Sign off on this direction"
   - "Revise — I'll give feedback"
   - "Abandon design-systems flow and capture a brief instead"
5. **Revise loop.** Rejection → ask for a one-paragraph feedback note →
   re-invoke `design-systems:create` with the original brief + the
   feedback appended. Hard cap at **two revisions**. After the second
   revision, if the user still rejects, stop looping and record the
   latest DESIGN.md anyway; the downstream spec can refine further.

## Brief-only sub-flow

When the user picks "just capture an aesthetic brief":

1. One `AskUserQuestion` asking for the aesthetic direction as free text
   (with the same 3–4 seeded options + Other as in the full sub-flow).
2. Record the verbatim text. No file is written. The rendered brief's
   *Design direction* paragraph quotes the captured text.

## TUI-aware prefix

When design-systems is being invoked *for* the TUI (distinct identity
case), prepend this paragraph to the aesthetic brief passed to
`design-systems:create`:

> "Terminal UI — must render in a monospace terminal; only ANSI-safe
> colours; no typography scale beyond bold, dim, and reverse; no
> box-shadow; no border-radius; aesthetic expressed through colour,
> box-drawing characters, and whitespace."

## Web + TUI, shared design

After the Web sub-flow completes, ask:

> "Should the TUI share the Web UI's primary design elements (colour
> palette, type hierarchy where applicable), or have a distinct
> identity?"

- **Shared.** Write `TUI_DESIGN.md` at cwd with this exact template
  (substituting the actual DESIGN.md relative path):

  ```markdown
  # TUI Design — References DESIGN.md

  This TUI reuses the primary design elements from `./DESIGN.md`:

  - Colour palette: the shielded / dominant / accent colours in
    DESIGN.md, restricted to the nearest ANSI-safe equivalents.
  - Typography hierarchy: maps DESIGN.md's weight levels to the
    terminal's bold / dim / reverse controls. No size scale is
    applicable in a monospace terminal.
  - Spacing: DESIGN.md's spacing tokens map 1:1 to character columns /
    rows where sensible.

  Items without a terminal equivalent (shadows, radii, type scale) are
  intentionally omitted.
  ```

- **Distinct.** Repeat the appropriate sub-flow (full or brief-only)
  with the TUI-aware prefix prepended to the aesthetic brief.

## Error rules

- `design-systems:create` unavailable (plugin not installed) → catch
  Skill tool error on first invoke, fall back to brief-only sub-flow,
  tell the user why ("/design-systems:* not available, capturing brief
  only").
- `design-systems:specimen` fails after create succeeded → record that
  `DESIGN.md` was written, skip sign-off, add a note to the rendered
  brief's Design direction paragraph asking the downstream spec to
  re-run specimen.
- Pre-existing `DESIGN.md` is malformed / unreadable → treat as not
  present for reuse. Do not try to repair.

## How Phase 5 records its outcome

Store one of these three values (they drive the Design direction
paragraph in Phase 9):

- `reuse:<path>` — user accepted an existing DESIGN.md.
- `generated` — full sub-flow completed and wrote DESIGN.md (and
  TUI_DESIGN.md if applicable).
- `brief:"<verbatim text>"` — brief-only sub-flow; no file written.
