---
description: Imagines a tentative decision has failed catastrophically 6 months from now, then spawns subagents to write the post-mortems. Surfaces concrete failure modes before commitment.
argument-hint: "[the tentative decision + relevant context] [--depth=N]"
---

# /decision-making:pre-mortem

## When to use

Use this command when a decision has been tentatively made and you want to
surface failure modes before committing. It is intended for the moment after
you have arrived at a candidate answer but before you act on it.

Use `/decision-making:red-team` earlier in the process when the plan is
still open to critique and has not yet been tentatively chosen. `red-team`
stress-tests an artifact before a decision is made; `pre-mortem` assumes
the decision is made and asks how it failed.

## Cost tier

Medium. 5 parallel `general-purpose` subagents at default depth, one round. See `references/cost-tiers.md`.

## Input

The tentative decision plus any relevant context the post-mortem writers
will need (constraints, assumptions, prior discussion, known trade-offs).
Optional: `--depth=N` to override the fan-out count.

## Fan-out rules

- **Default:** 5 subagents.
- **Floor:** 3. Below 3, you lose the clustering signal; you are just
  getting a couple of failure narratives which is barely better than the
  main thread writing one inline.
- **No upper cap**, but cost scales linearly with fan-out.
- `--depth=N` flag overrides the default; values below 3 are rejected
  with an error.

## Workflow

1. **Parse `--depth`** — if the caller provided `--depth=N`, use that
   value (rejecting any `N < 3` with an error explaining the floor).
   Otherwise, use the default of 5.

2. **Spawn N parallel post-mortem writers** — use the Agent tool with
   `subagent_type: general-purpose` to spawn N subagents in parallel.
   Each subagent receives the same prompt, with the tentative decision
   and context substituted into the bracketed slots verbatim:

   ```
   It is 6 months from now. The following decision failed
   catastrophically. Write the post-mortem explaining exactly how
   and why it failed.

   The decision that failed:
   [TENTATIVE DECISION]

   Context at the time the decision was made:
   [CONTEXT]

   Your post-mortem must be concrete:
   - Name specific failure modes, not abstract risks
   - Tell the story of HOW it failed, not WHETHER it could fail
   - Include the specific event, system, or assumption that broke
   - Explain the downstream consequences
   - Be honest: if the decision was actually defensible and survived,
     say so and explain what made the difference

   Good-faith rules: no fabricated technical facts (you may invent
   plausible specific events as narrative), no straw-manning the
   decision, commit fully to the post-mortem framing without
   equivocation.
   ```

   Each subagent returns one concrete failure narrative.

3. **Cluster failure modes** — the main thread groups the returned
   narratives by root cause. Similar failure modes from different
   subagents converge into a cluster; unique failure modes stand alone.

4. **Rank by plausibility × severity** — for each cluster, assign
   plausibility (low | medium | high) and severity (low | medium | high).
   Load-bearing failure modes are those rated high × high or high × medium.

5. **Identify the single most load-bearing failure mode** — this becomes
   the verdict line. State it concretely (not "execution risk" but "the
   legacy import job doesn't handle 3+ character locale codes and quietly
   drops 4% of rows").

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line = the single most load-bearing failure mode, stated concretely. The Reasoning section contains the full clustered failure modes with plausibility × severity annotations.

## Good-faith requirements

All spawned subagents must follow the four good-faith rules stated in `references/verdict-format.md` and the spawning guidance in `references/subagent-patterns.md`. The prompt template above states the rules inline.
