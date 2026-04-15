---
description: Spawns 4-6 lens subagents, each inhabiting a distinct perspective, then synthesizes their positions. Use for ambiguous, value-laden, or multi-stakeholder questions where framing matters.
argument-hint: "[the question + relevant context] [--lenses=<comma-separated list>]"
---

# /decision-making:council

## When to use

The question is ambiguous, value-laden, or multi-stakeholder and no single perspective can resolve it cleanly. Use when framing matters as much as conclusions. Useful when you suspect the "right answer" depends on whose pain point you're solving.

## Cost tier

Medium. 4-6 parallel `Lens` subagents (sonnet model), one round. See `references/cost-tiers.md`.

## Input

The question + relevant context.

Optional: `--lenses=<comma-separated list>` to specify lenses explicitly. Useful for recurring decision types where consistency across runs matters.

## Workflow

1. **Determine lenses** — if `--lenses=<list>` is provided, use exactly those lenses. Otherwise, the main thread identifies 4-6 distinct lenses relevant to the question and states its selection (with a short justification for each lens) in the Reasoning section of the output. Example lenses for a technical decision:
   - The ops engineer who'll be paged at 3am
   - The new hire reading this in 6 months
   - The security reviewer
   - The staff eng optimizing for system coherence
   - The PM shipping Friday
   - The principal eng thinking 2 years out

2. **Spawn one Lens subagent per lens in parallel** — use the Agent tool with `subagent_type: lens`. Each subagent is given its assigned lens + a short description of what that lens cares about + the question + relevant context. Include this exact prompt template:

   ```
   You inhabit this perspective: [LENS NAME]

   What this perspective cares about: [WHAT THE LENS CARES ABOUT]

   The question: [QUESTION]

   Context: [RELEVANT CONTEXT]

   Write a short position statement (~150 words) from your assigned
   perspective alone. Do not frame it as "from the X perspective..."
   — write as if you ARE this perspective and it is the only one
   that matters.

   Do not meta-comment. Do not try to be balanced. Inhabit the lens.
   ```

3. **Collect positions** — gather all parallel responses. Do not share them between subagents (the `Lens` agent definition already enforces non-cross-contamination, but the main thread should also avoid accidentally passing one lens's output to another).

4. **Synthesize — not by averaging** — identify:
   - **Convergence points** — where multiple lenses arrive at compatible conclusions. These are likely robust insights.
   - **Genuine conflicts** — where lenses irreconcilably disagree. This is the real tension in the decision.
   - **What the conflict reveals** — the meta-insight: what the decision is *actually* between, which may differ from how the question was posed.

5. **Render verdict** — the verdict is the synthesis position (one sentence). The synthesis often looks like "the real decision is between X and Y, not A and B" — that reframing is the valuable output, not a specific recommendation.

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line = the synthesis position (one sentence). The Reasoning section contains the lens selection + each lens's position + the synthesis analysis (convergence, conflict, meta-insight).

## Good-faith requirements

All spawned subagents are instances of the `Lens` subagent type (`agents/lens.md`), which enforces non-cross-contamination and no meta-commentary. Additionally, the main thread must follow the spawning patterns in `references/subagent-patterns.md`.
