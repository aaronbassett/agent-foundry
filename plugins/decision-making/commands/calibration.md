---
description: Spawns 3 independent estimators for quantitative or probabilistic questions, compares their estimates, and derives confidence from the spread. Fan-out is fixed at 3.
argument-hint: "[quantitative or probabilistic question + relevant context]"
---

# /decision-making:calibration

## When to use

The decision depends on a quantitative or probabilistic estimate, and you need a confidence check on the estimate itself — not just an answer. Examples: "how long will the migration take?", "what's the probability this ships by Q3?", "how much will the infra cost increase?"

## Cost tier

Low. Exactly 3 parallel `general-purpose` subagents, one round. Fan-out is not configurable. See `references/cost-tiers.md`.

## Input

A quantitative or probabilistic question + relevant context.

## Why fan-out is fixed at 3

Two estimators give no triangulation signal — if they disagree, you have no way to tell which one is closer, and if they agree you can't distinguish real convergence from shared blind spots. Five or more estimators is diminishing returns for double the cost: the third estimator buys most of the signal, and each additional one buys less. Keeping the fan-out fixed at 3 forces users toward the right shape for this tool and prevents misuse as a generic parallel-thinking knob that gets dialed up whenever someone wants "more thinking."

## Workflow

1. **Spawn exactly 3 parallel estimators** — each `general-purpose` subagent is given the same question, the same context, and the same prompt. They cannot see each other's outputs. Use this exact prompt template:

   ```
   You are producing a calibrated estimate for a quantitative or
   probabilistic question.

   The question: [QUESTION]

   Context: [CONTEXT]

   Return three things:
   1. A point estimate (a single number with units)
   2. A confidence interval (e.g., "80% CI: 4-12 weeks")
   3. The reasoning behind your estimate (2-4 sentences explaining
      what assumptions drove it)

   Do not hedge with "it depends" unless you also give a specific
   number that you would commit to if forced. Do not copy the
   question back. Commit to a number.

   Good-faith rules: no fabricated base rates, no straw-manning the
   question, acknowledge what you're uncertain about inside your
   reasoning.
   ```

2. **Collect all three estimates** — in parallel, without cross-contamination.

3. **Analyze the spread** — compare the three point estimates:
   - **Convergence** (all 3 within ~10% of each other) — High confidence. Use the median as the point estimate. Use the union of intervals as the reported interval.
   - **Mild divergence** (spread ~20-50%) — Medium confidence. Use the union of intervals. In the Reasoning section, flag what drives the spread (which assumptions the estimators disagreed on).
   - **Wild divergence** (spread > 50%) — Low confidence. The spread is itself the signal. In the Reasoning section, surface the central uncertainty as the thing the caller most needs to resolve.

4. **Render verdict** — the verdict line is the point estimate + interval (e.g., `6 weeks [4-10]` or `42% [25-60]`). The Reasoning section contains all three subagent estimates side-by-side plus the spread analysis.

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line = point estimate + interval, formatted as `<value> [<low>-<high>]` or `<value>% [<low>-<high>]`.

## Good-faith requirements

All spawned subagents must follow the four good-faith rules stated in `references/verdict-format.md` and the spawning guidance in `references/subagent-patterns.md`. The prompt template above states the rules inline.
