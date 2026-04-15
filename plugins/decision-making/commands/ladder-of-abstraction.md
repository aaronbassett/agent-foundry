---
description: Reframes a question at progressively higher and lower altitudes via two parallel subagents (climber and descender). Use when the framing feels wrong or options feel forced.
argument-hint: "[the question or decision that feels wrong + relevant context]"
---

# /decision-making:ladder-of-abstraction

## When to use

Use this command when the question feels off, the options feel forced, or the decision keeps getting stuck. Reach for it when you suspect the problem is the framing, not the answer. The valuable output is often "the real decision is at a different altitude than where it was posed."

## Cost tier

Low. Two parallel `general-purpose` subagents, one round. See `references/cost-tiers.md`.

## Input

The question or decision that feels wrong + relevant context.

## Workflow

1. **Spawn the Climber** — `general-purpose` subagent with this prompt template (verbatim):

   ```
   Your job: reframe the question below at progressively higher levels
   of abstraction. Walk up a ladder.

   The question: [QUESTION]

   Context: [CONTEXT]

   For each rung on the way up, ask:
   - What are we actually trying to achieve with this?
   - What problem does that solve?
   - Is that the right problem to be solving?

   Return 3-4 rungs, each rephrasing the question at a higher level.
   Mark the highest rung where the question still feels actionable
   (above that, it becomes too vague to decide on).

   Do not answer the question. Only reframe it.
   ```

2. **Spawn the Descender in parallel** — `general-purpose` subagent with this prompt template (verbatim):

   ```
   Your job: reframe the question below at progressively more concrete
   levels. Walk down a ladder.

   The question: [QUESTION]

   Context: [CONTEXT]

   For each rung on the way down, ask:
   - What would doing this look like on day one?
   - What is the first file you would touch?
   - What specific thing breaks or works?

   Return 3-4 rungs, each rephrasing the question at a more concrete
   level. Mark the lowest rung where the question is still
   generalizable (below that, it becomes a one-off detail).

   Do not answer the question. Only reframe it.
   ```

3. **Compare the two ladders** — main thread compares the climb and descent. The real decision often lives at a different altitude than where it was posed:
   - **Higher altitude** — "you're not choosing between two databases, you're choosing whether to own infrastructure at all."
   - **Lower altitude** — "you're not choosing an architecture, you're choosing how to handle this one gnarly edge case."
   - **Same altitude** — both ladders confirm the question is well-posed at its current altitude.

4. **Render verdict** — one of two shapes:
   - The reframed question at the correct altitude
   - `framing is correct at current altitude` (literal string, when both ladders confirm no reframing is needed)

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line = the reframed question, OR the literal sentinel `framing is correct at current altitude`. The Reasoning section contains the climb summary, descent summary, and an explanation of where the real decision lives.

## Good-faith requirements

All spawned subagents must follow the four good-faith rules stated in `references/verdict-format.md` and the spawning guidance in `references/subagent-patterns.md`.
