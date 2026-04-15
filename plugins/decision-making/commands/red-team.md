---
description: Stress-tests a proposed plan, answer, design, or artifact by spawning a committed adversarial subagent that finds the strongest reasons it will fail. Verdict is accept | revise | reject.
argument-hint: [the plan/answer/artifact to red-team + relevant context]
---

# /decision-making:red-team

## When to use

Use this command when you have a proposed plan, answer, design, or artifact
and want to stress-test it before committing. It is intended for the moment
just before a decision is finalized — when the shape of the plan is clear
enough to critique but not yet locked in.

Use `/decision-making:pre-mortem` instead for decisions that have already
been tentatively made and you want to imagine how they failed in hindsight.
`red-team` is for catching failure modes before commit; `pre-mortem` is for
surfacing them after tentative commit.

## Cost tier

Medium. One committed adversarial subagent, one round. See `references/cost-tiers.md`.

## Input

The plan, answer, design, or artifact to be red-teamed, plus any relevant
context the reviewer will need (constraints, assumptions, prior discussion,
known trade-offs). If the caller's arguments do not include an artifact to
review, ask once for it.

## Workflow

1. **Spawn one devil's-advocate subagent** — use the Agent tool with
   `subagent_type: general-purpose`. Pass the artifact and context into the
   bracketed slots of this prompt template verbatim:

   ```
   You are a devil's advocate reviewing a proposed [plan / answer /
   design / artifact]. Your sole mandate: find the strongest reasons
   this will fail.

   The artifact under review:
   [ARTIFACT]

   Context:
   [CONTEXT]

   Look for:
   - Hidden assumptions that may not hold
   - Edge cases the artifact does not account for
   - Second-order effects the author may not have considered
   - What a hostile reviewer would say in a code review
   - Failure modes under unusual load, adversarial input, or stress

   Return a ranked list of weaknesses. For each weakness, assign:
   - Severity (low | medium | high) — how bad would it be if it happened
   - Plausibility (low | medium | high) — how likely is it to happen

   Good-faith rules: no fabricated facts, no straw-manning, focus on
   real weaknesses (not nit-picks), commit fully to the adversarial
   stance without equivocation.
   ```

2. **Review the weaknesses** — the main thread reads the ranked list
   returned by the subagent and identifies the load-bearing weaknesses:
   those with high severity AND medium-or-high plausibility. Low-severity
   issues and implausible scenarios are noted but not load-bearing.

3. **Render verdict** — render exactly one of three outcomes:
   - `accept` — all weaknesses are low-severity or implausible; the plan
     survives scrutiny as-is.
   - `revise` — load-bearing weaknesses exist but the plan survives
     targeted fixes. Identify the top 3 weaknesses that must be addressed
     before the plan is committed.
   - `reject` — fundamental flaws; the plan should be abandoned or
     restarted from a different starting point.

## Why one subagent instead of several

Multiple red-teamers tend to produce overlapping critiques — three shallow
passes at the same obvious weaknesses rather than three independent deep
dives. One committed adversarial context, allowed to develop a single
coherent line of attack, goes deeper than three diluted ones. Callers who
genuinely want multiple independent attacks can invoke `red-team` multiple
times; each invocation gets its own committed adversarial frame rather than
sharing one with rivals.

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line must start with `accept`, `revise`, or `reject` as the first word so plan steps can branch on a string match.

## Good-faith requirements

All spawned subagents must follow the four good-faith rules stated in `references/verdict-format.md` and the spawning guidance in `references/subagent-patterns.md`. The prompt template above states the rules inline.
