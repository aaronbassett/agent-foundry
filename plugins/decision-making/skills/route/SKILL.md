---
name: route
description: Use when you need to pick a decision-making technique for the current question. Matches the decision shape against seven techniques (tribunal, adversarial, red-team, pre-mortem, council, ladder-of-abstraction, calibration) and recommends one. Plan steps that already know which command to invoke should call the command directly and skip this skill.
---

# Decision-making route

## When to use this skill

You have a decision to make and don't already know which technique fits. If you do know, invoke the command directly and skip this skill. This skill is for mid-task triage and cold-start human invocation — it is explicitly bypassable, and plan steps should bypass it.

## The rubric

### tribunal  (cost: High)

**Decision shape:** You have N≥2 concrete options, the decision is load-bearing and hard to reverse, and you want rigorous deliberation with rebuttals before committing. Use when stakes justify the ceremony.

**Signals:**
- Irreversible or expensive-to-undo
- Stakeholders disagree or context is contested
- You want an honest "unable to decide" escape hatch

**Not this if:** You need a quick tiebreak and the decision is reversible → use `adversarial`.

**Invoke:** `/decision-making:tribunal "<decision + options>"`

### adversarial  (cost: Medium)

**Decision shape:** You have N≥2 concrete options and want a quick tiebreak with steelmanned briefs. One round of advocates, no rebuttals, no iteration.

**Signals:**
- Decision is reversible or moderate-stakes
- Options are clear and enumerable
- You want a committed pick, not open-ended analysis

**Not this if:** Stakes are high, you want rebuttals, or you want an honest "unable to decide" escape hatch → use `tribunal`.

**Invoke:** `/decision-making:adversarial "<decision + N options>"`

### red-team  (cost: Medium)

**Decision shape:** You have a proposed plan, answer, design, or artifact and want to stress-test it before committing. Verdict is accept | revise | reject.

**Signals:**
- The plan is still open to critique, not already committed to
- You want someone committed to finding reasons it will fail
- You're about to make it official

**Not this if:** You're choosing between named options → use `adversarial` or `tribunal`. Not this if: the decision has already been tentatively made and you want to surface failure modes → use `pre-mortem`.

**Invoke:** `/decision-making:red-team "<the plan/artifact>"`

### pre-mortem  (cost: Medium)

**Decision shape:** A decision has been tentatively made and you want to surface concrete failure modes before committing. Subagents imagine it failed 6 months from now and write the post-mortems.

**Signals:**
- You've arrived at a candidate answer but haven't acted on it yet
- You want specific, plausible failure narratives
- "What could go wrong" has been asked but not answered

**Not this if:** The plan is still open to critique rather than tentatively committed → use `red-team`.

**Invoke:** `/decision-making:pre-mortem "<the tentative decision>"`

### council  (cost: Medium)

**Decision shape:** The question is ambiguous, value-laden, or multi-stakeholder and no single perspective can resolve it cleanly. Multiple lens subagents inhabit distinct perspectives; main thread synthesizes.

**Signals:**
- The "right answer" depends on whose pain point you're solving
- Framing matters as much as conclusions
- You suspect different stakeholders would answer differently

**Not this if:** The question has named enumerable options → use `adversarial`/`tribunal`. Not this if: the question itself feels wrong → use `ladder-of-abstraction`.

**Invoke:** `/decision-making:council "<the question>"`

### ladder-of-abstraction  (cost: Low)

**Decision shape:** The question feels off, the options feel forced, or the decision keeps getting stuck. Two subagents reframe it up and down.

**Signals:**
- You can't choose because none of the options feel right
- The decision has been deadlocked for a while
- You suspect you're solving the wrong problem

**Not this if:** The framing is already correct and you just need to decide — use `adversarial`/`tribunal`/`council`.

**Invoke:** `/decision-making:ladder-of-abstraction "<the question that feels wrong>"`

### calibration  (cost: Low)

**Decision shape:** The decision depends on a quantitative or probabilistic estimate, and you need a confidence check on the estimate itself — not just an answer. Three independent estimators; confidence derived from spread.

**Signals:**
- The question has a numeric answer
- You need to know how sure you are, not just what the answer is
- Spread matters as much as the median

**Not this if:** The question is qualitative — use one of the other six.

**Invoke:** `/decision-making:calibration "<quantitative question>"`

## Quick shape-to-technique table

| Decision shape | Technique |
|---|---|
| N options, quick pick | `adversarial` |
| N options, high stakes | `tribunal` |
| One proposed plan to stress-test | `red-team` |
| Tentative decision, check before committing | `pre-mortem` |
| Ambiguous / value-laden / multi-stakeholder | `council` |
| The question itself feels wrong or forced | `ladder-of-abstraction` |
| Estimate + need confidence | `calibration` |

## Fallback triage

If no rubric entry obviously fits, or if you're unsure between two, walk through these three questions in order.

1. **Are there named, enumerable options?** Yes → `adversarial` (quick) or `tribunal` (high stakes). No → skip to Q2.
2. **Is there a proposed plan or answer already on the table?** Yes, still open to critique → `red-team`. Yes, tentatively committed → `pre-mortem`. No → skip to Q3.
3. **Is the question framed correctly?** Genuinely unsure → `ladder-of-abstraction`. Yes but ambiguous/value-laden → `council`. Yes and quantitative → `calibration`.

## Chaining idioms

Techniques compose. You can feed one command's output into another to get a layered result. Here are common idioms that have shown up in practice.

- **`council → tribunal`** — surface stakeholder conflicts first (council), then deliberate formally among the positions that council identifies (tribunal).
- **`ladder-of-abstraction → adversarial`** — reframe the decision at the right altitude first, then pick among the reframed options cheaply.
- **`calibration → red-team`** — get a calibrated estimate for a quantitative driver, then red-team the plan that depends on it (catches "this assumes the estimate is at the high end" failures).
- **`pre-mortem → tribunal`** — if pre-mortem surfaces a load-bearing failure mode, run tribunal on "proceed as planned vs. mitigate the failure mode."
- **`adversarial → tribunal` (conditional)** — run `adversarial` cheaply first; if it returns Low confidence, escalate to `tribunal`. This is the most common plan-step pattern.

### Anti-idioms

- **Don't chain `red-team → red-team`** — red-teaming a critique produces meta-fog, not sharper decisions. Chain `red-team → pre-mortem` instead for a second layer of scrutiny from a different angle.
- **Don't drop `tribunal` into a plan step casually** — tribunal is expensive and multi-round. Gate it behind a condition (e.g., "if `adversarial` returned Low confidence, then `tribunal`"). Plan authors should treat tribunal as an escalation path, not a default.

## What the router does NOT do

The router names a technique; it does not run the deliberation. The router is also not authoritative — if the caller has context the rubric didn't account for, they should override. And plan steps that already know which command to invoke should invoke it directly, bypassing this skill entirely.
