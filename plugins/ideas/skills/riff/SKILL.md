---
name: ideas:riff
description: >-
  This skill should be used when the user wants sustained divergent exploration
  of a theme — riffing, branching, finding unexpected angles without converging
  toward a vision or spec. Works independently, before ideation (to generate
  raw material), or after refinement (to re-expand a stripped idea). Uses a
  toolkit of 22 creative techniques adapted to conversational energy. Produces
  a branching outline of ideas explored. Triggers include "riff on", "explore
  ideas around", "let's brainstorm about", "what could we do with", "help me
  think around", "idea jam", "think out loud about", "go wild with",
  "free-associate on", or when the user wants to explore an idea space.
---

# Riff: Sustained Divergent Exploration

## Overview

Explore an idea space without convergence pressure. Where ideation
expands possibilities toward a vision and refinement contracts them to
a core, riffing stays in divergent space — branching, combining,
inverting, and surprising. The output is a branching outline of
everything explored, not a decision about what to build.

Riff is standalone. It can be used before ideation (to generate raw
material), after refinement (to re-expand a stripped idea), or
completely independently. A riff session's output can naturally feed
into other skills, but transitions are always the user's choice,
never automatic. Riff never suggests "now let's move to ideation" or
"this is ready for refinement." It stays in its lane: divergence.

<HARD-GATE>
The gate is on shifting from ideation to engineering, NOT on idea
content. Ideas expressed through implementation details are welcome —
app concepts naturally include technical specifics (Bluetooth proximity
detection, push notifications, APIs, webhooks, ML classifiers) because
the idea and its mechanism are often inseparable.

What IS prohibited: designing systems, writing code, proposing
architecture, creating implementation plans, suggesting tech stacks,
scaffolding projects, or invoking implementation skills.

The test: "Is Claude generating new ideas, or has it stopped riffing
to start building?" If the answer is building, stop.
</HARD-GATE>

## When to Use

- User wants to explore a theme, concept, or idea space without
  committing to a direction
- User wants creative divergence — branches, angles, unexpected
  connections
- User has a seed (word, phrase, paragraph, or document) and wants
  to see where it could go
- User says "riff on...", "what could we do with...", "let's
  brainstorm about..."

## When NOT to Use

- User wants to develop a specific idea into a vision document →
  use **ideas:ideation**
- User wants to strip an idea to its core or pressure-test it →
  use **ideas:refine**
- User is ready to design or implement something → use the
  **superpowers:brainstorming** skill for design, or
  **superpowers:writing-plans** for implementation planning
- User wants a structured requirements gathering process

## Input Handling

### Bare theme (word or phrase)

Acknowledge theme, immediately throw out 2-3 opening angles. No
clarifying questions. "Neighborhood apps" → start riffing on
hyperlocal social, ambient awareness, micro-commerce, whatever
comes first. Understanding deepens through riffing, not before it.

### Seed + context (theme plus starting thoughts)

Read context, riff into the gaps — angles they haven't mentioned.
If the user says "I've been thinking about neighborhood apps for
elderly residents," don't repeat their framing. Go where they
haven't: intergenerational exchange, passive safety nets, oral
history capture, skill-sharing economies.

### Existing artifact (vision doc, blog post, README)

Read document, riff outward — what's adjacent to the vision, what's
assumed but unexamined, what happens if you invert a key premise.
A vision doc about a todo app? Riff on: what if completion wasn't
the goal, what if tasks were social, what if the app fought against
productivity.

**Key principle:** No intake phase. Start riffing immediately.
Understanding deepens through riffing, not before it.

## Technique Toolkit

Four groups of techniques, deployed based on conversational energy
and need. Full descriptions in the reference files — summaries here
for quick selection.

### Reframing (7) — change the lens

See `references/techniques-reframing.md` for full descriptions.

| Technique | What it does | When to deploy |
|-----------|-------------|----------------|
| Perspective shift | View through different lens — first-time user, skeptic, competitor, different industry/culture. Includes designing FOR a different audience. | Conversation settled into one viewpoint |
| Word pivot | Pick key word, swap with synonyms/metaphors. "Network → ecosystem → organism → market" | Framing feels fixed |
| Metaphor mutation | Evolve a metaphor through successive steps. "Marketplace → auction → game show" | Analogy productive but could go further |
| Medium shift | Change form entirely. "What if this was a game? A physical object? A protocol?" | Idea trapped in its current form |
| Emotion-driven ideation | Start from feeling, not function. "What would a delightful version look like?" | Ideation too function-first |
| Narrative seeding | Turn into a story. "A user wakes up and..." | Abstract thinking isn't producing |
| Misuse exploration | "What's the weirdest way someone could use this?" | Intended use feels too narrow |

### Mutation (8) — change the idea

See `references/techniques-mutation.md` for full descriptions.

| Technique | What it does | When to deploy |
|-----------|-------------|----------------|
| Inversion | "What if the opposite were true?" Flip assumptions. | Conversation too agreeable |
| Subtraction | Remove the most obvious element. What's left? | Idea feels bloated or conventional |
| Exaggeration | Take to 10x/100x scale — but keep plausible. | Ideas safe and incremental |
| Signal amplification | Pick weak signal, make it the center. "This tiny feature becomes the whole product." | Small detail deserves more attention |
| Remove the goal | Drop original objective. "If we didn't care about X, what would we build?" | Goal might be wrong or too narrow |
| Constraint game | Add arbitrary constraint. "What if it had to work offline?" | Exploration broad but shallow |
| Constraint explosion | Add many conflicting constraints simultaneously. | Single constraints produce predictable results |
| Future-back ideation | Start from solved future. "In 2035 this is solved — how?" | Current constraints blocking imagination |

### Connection (4) — bring something in

See `references/techniques-connection.md` for full descriptions.

| Technique | What it does | When to deploy |
|-----------|-------------|----------------|
| Analogy | Draw parallels from unrelated domains (biology, music, urban planning, cooking). | Idea stuck in its own domain |
| Combination | Smash two session ideas together. Includes grafting external product features. | Threads haven't cross-pollinated |
| Mechanic transfer | Steal specific mechanism from another domain. "Use matchmaking like online games." | Analogies too abstract |
| Random stimulus insertion | Introduce arbitrary concept, force relevance. "What does this have to do with a vending machine?" | Thinking needs hard lateral jolt |

### Flow (3) — manage the energy

See `references/techniques-flow.md` for full descriptions.

| Technique | What it does | When to deploy |
|-----------|-------------|----------------|
| "Yes, and..." | Build on what user said without filtering — add, extend, escalate | User is on a roll |
| Forking path | Identify decision point, explore both branches | Obvious either/or — explore both |
| Idea mutation loop | Mutate one property, repeat 5x rapidly. Speed over quality. | Energy high, volume beats precision |

## Adaptive Dynamic

Three modes, fluidly shifting. Claude never announces which mode
it's in.

**Lead mode** — Generate, provoke, throw out angles.
When: session start, user giving short responses, energy low, thread
exhausted.

**Amplify mode** — Build on user's momentum.
When: user generating, energy high, thread productive, user
explicitly steering.

**Challenge mode** — Push back, invert, pressure-test.
When: ideas clustering around safe territory, same assumption
unchallenged, converging too early, idea accepted too quickly.

**Staleness detection:** If last 3-4 exchanges feel repetitive,
deliberately break pattern. Switch technique, introduce random
stimulus, or invert the current thread. Repetition is the enemy of
divergence.

## Selection Heuristics

These bridge technique selection and adaptive dynamic — use the
conversational signals to pick the right technique and mode together.

- Conversation going stale/repetitive? → Switch technique
- User energized and generating? → "Yes, and..." — amplify
- User quiet/short responses? → Lead harder, 2-3 provocative angles
- Single thread going deep? → Let it run, then fork/combine to
  branch out
- Lots of threads, none deep? → Constraint game or subtraction to
  force depth
- Everything safe/obvious? → Inversion, exaggeration, or random
  stimulus
- Same technique 3+ times? → Switch. Don't become "the analogy
  show."

## Session Flow

### Opening

Start riffing immediately. 2-3 angles on the theme. No preamble, no
"great question," no restating the prompt. For substantial input
(paragraph or document), lead with the most interesting tension or
gap rather than summarizing what was provided.

### Exploration

Bulk of session. No fixed sequence, no checkpoints, no minimum
exchanges. Keep it interesting — variety of techniques, breadth of
territory, ideas that build on each other. Follow energy. If a
thread is hot, stay on it. If it's cooling, branch or pivot.

### Wrap-up

User-triggered only. Phrases like "let's wrap up," "capture this,"
"make the map," or "what did we come up with" signal wrap-up. Until
then, keep riffing. Assemble the branching outline from the
conversation.

### Soft signal

If a particularly strong thread emerges during exploration, note it
lightly — "this one has legs" — without forcing a decision or
shifting toward convergence. The user decides what to do with it.

## AskUserQuestion Usage

AskUserQuestion is NOT used during riffing. It breaks creative flow.
Riffing is conversational — Claude riffs, the user reacts, Claude
builds on the reaction. Structured multiple-choice questions kill
the improvisational energy that makes riffing work.

**One exception:** During wrap-up, may use AskUserQuestion to
confirm which threads felt hottest if genuinely unclear from the
conversation. This is rare — engagement signals are usually
readable from the dialogue.

## Deliverable: Branching Outline

```markdown
# Riff: [Theme]

**Date:** YYYY-MM-DD
**Seed:** [What the user started with]

## Branches

### [Branch Name]
- [Key idea]
  - [Sub-idea or variation]

## Connections
- [Branch X] + [Branch Y] → [insight about how they relate]

## Hottest Threads
- [1-3 ideas/branches that got strongest reaction, with note on why]

## Open Questions
- [Questions that surfaced but weren't resolved]
```

**Assembly logic:** Built retroactively from conversation, not
tracked in real-time. Branch names are inferred from natural
clusters in the dialogue. "Hottest threads" based on user
engagement signals — what they built on, returned to, or reacted
most strongly to.

Saved to `docs/ideas/YYYY-MM-DD-<topic>-riff.md` relative to the
project root. Create the `docs/ideas/` directory if it doesn't exist.

## Key Principles

- **Start fast** — No intake phase. Riff immediately.
- **Stay divergent** — Resist convergence. Breadth and surprise,
  not decisions.
- **Buildable, not fantasy** — Stretch but stay possible. Wild
  extrapolation as technique, but ideas should be executable.
- **No forced structure** — No minimum exchanges, no checkpoints.
  User decides when done.
- **Surprise yourself** — If predictable, push harder. Switch
  technique. Introduce randomness.
- **Read the room** — Match energy. Lead when needed, amplify when
  user is cooking, challenge when comfortable.
- **Don't repeat** — Track techniques used. Same technique 3x =
  switch.

## Additional Resources

### Session Examples

See `examples/` for complete worked examples:
- **`examples/session-example.md`** — Abbreviated riff session
  (~8-10 exchanges) showing opening, technique deployment, mode
  switching, and wrap-up
- **`examples/deliverable-example.md`** — Complete branching outline
  deliverable from a realistic session

### Reference Files

Full technique descriptions with examples and deployment guidance:
- **`references/techniques-reframing.md`** — 7 techniques for
  changing the lens
- **`references/techniques-mutation.md`** — 8 techniques for
  transforming ideas
- **`references/techniques-connection.md`** — 4 techniques for
  introducing external material
- **`references/techniques-flow.md`** — 3 meta-techniques for
  session energy
