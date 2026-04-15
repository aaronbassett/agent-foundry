# Verdict format

Every command in the decision-making plugin produces output in this shape, in this order, and the section headings below are stable so plan steps and downstream callers can extract fields reliably by grepping for the literal headings. Commands differ in how they populate the body of each section, but the section names, their order, and the top-level contract never change.

## Verdict

One sentence. The actionable takeaway. No hedging, no preamble, no restating the question. The caller should be able to read only this line and know what the command concluded.

The exact shape of the verdict line depends on which technique produced it:

| Technique | Verdict line shape |
|---|---|
| `tribunal` | The chosen option name, or `Unable to decide — [reason]` |
| `adversarial` | The chosen option name |
| `red-team` | `accept` \| `revise` \| `reject` |
| `pre-mortem` | The single most load-bearing failure mode, stated concretely |
| `council` | The synthesis position (one sentence) |
| `ladder-of-abstraction` | The reframed question, OR `framing is correct at current altitude` |
| `calibration` | Point estimate + interval (e.g., `6 weeks [4-10]` or `42% [25-60]`) |

The `Unable to decide — [reason]` verdict shape is available **only to `tribunal`** in v1. The other six techniques commit to a verdict — adversarial picks a winner, red-team returns one of its three labels, pre-mortem names a concrete failure mode, council synthesizes, ladder-of-abstraction either reframes or affirms the current framing, and calibration always produces an estimate and interval. Callers who want an honest "cannot decide" escape hatch escalate to `tribunal`.

### Verdict-line matching guidance for plan steps

Not every verdict line is equally match-friendly. Plan steps that branch on a command's verdict should understand which technique produces which shape of match target:

- **`red-team` — enum match.** The verdict line starts with one of three literal tokens: `accept`, `revise`, or `reject`. Plan steps branch with a simple first-word or prefix comparison. This is the gold standard for plan-step branching.
- **`calibration` — suffix anchor.** The verdict line always ends with a bracketed interval `[low-high]`, preceded by a point estimate that is either a unit'd quantity (e.g., `6 weeks`) or a percentage (e.g., `42%`). Plan steps match the `[low-high]` suffix or parse the leading value.
- **`ladder-of-abstraction` — literal sentinel vs. free-form.** The verdict line is EITHER exactly the literal sentinel `framing is correct at current altitude` (lowercase, no trailing punctuation) OR a free-form reframed question. Plan steps match on the sentinel; any other content means a reframe was produced. Subagents must emit the sentinel verbatim — no capitalisation drift, no trailing period.
- **`tribunal` — prefix anchor (for the escape hatch) or caller-known option names.** When `tribunal` cannot decide, the verdict line begins with the literal prefix `Unable to decide`. The separator and reason after the prefix are free-form (`—`, `-`, `:`, or anything else), so plan steps match on the `Unable to decide` prefix only. When `tribunal` does decide, the verdict line is one of the option names the caller passed in — plan steps match against that known candidate list.
- **`adversarial` — caller-known option names.** Same as `tribunal`'s deciding case: the verdict line echoes one of the option names the caller passed in. Plan steps match against the known candidate list.
- **`pre-mortem` — presence-only.** The verdict line is a free-form concrete sentence naming a failure mode. There is no stable anchor to match on — plan steps should branch on *presence* (the command returned successfully and produced a non-empty verdict) rather than content, and read the Reasoning section to decide what to do about it.
- **`council` — presence-only.** Same as pre-mortem: the synthesis position is free-form prose. Plan steps branch on presence and read the Reasoning section for detail.

Two consequences of this guidance:

1. **`tribunal` and `adversarial` require the caller to already know their option-name candidate list** when writing the branching plan step. This is unavoidable — the contract can't enumerate option sets it doesn't know.
2. **`pre-mortem` and `council` are "presence-only"** from a plan-step perspective. If a plan step needs more than "did this technique run?", it must read the Reasoning section, not the Verdict line. That's by design — both techniques produce value from synthesis the main thread can't collapse into a single token.

This file is placed at the plugin root under `references/` rather than nested inside a skill because it is shared across all seven commands and the routing skill. Future contributors: the location is intentional, not a drift from sibling-plugin convention.

## Confidence

One of three verbal levels:

- **High** — further deliberation unlikely to change the verdict.
- **Medium** — verdict is defensible but could flip under new evidence.
- **Low** — verdict is the current best guess; central unknowns remain.

"Unable to decide" is not a confidence level — it is a verdict shape (tribunal only), and when it applies Confidence is **Low**.

## Reasoning

A technique-specific body whose internal shape varies by command. The heading is stable; the contents are not. Callers that want the verdict and confidence can ignore this section; callers that want to audit the decision read it.

| Technique | Reasoning body shape |
|---|---|
| `tribunal` | Full Judgment block (recommendation, primary reasoning, trade-offs, key factors) |
| `adversarial` | Summary of each option's strongest case + why the winner prevailed |
| `red-team` | Ranked list of weaknesses + which are load-bearing |
| `pre-mortem` | Clustered failure modes with plausibility × severity |
| `council` | Convergence points + genuine conflicts + what the conflict reveals |
| `ladder-of-abstraction` | The climb and descent summaries + where the real decision lives |
| `calibration` | Each independent estimate side-by-side + spread analysis |

## What would change this verdict

One to five bullets naming concrete triggers — specific observations, measurements, or events that, if they occurred, would flip or materially weaken the verdict. These are not general caveats or hand-waving about uncertainty; they are falsifiable conditions the caller could actually check.

- Bad: "if the requirements change" — Good: "if the p99 latency budget drops below 50ms"
- Bad: "if we learn more about the domain" — Good: "if we confirm the legacy system has no read replicas"

For "Unable to decide" endings (tribunal only), this section IS the answer — it enumerates the central unknown(s) the caller must resolve before a verdict can be reached.

## Good-faith requirements

The following four rules apply to every subagent spawned by any command in this plugin:

1. no fabricated facts or citations
2. no straw-manning opposing positions
3. acknowledge genuine weaknesses when challenged
4. commit fully to the assigned perspective (no equivocation)

If a subagent violates a rule, the main thread flags the violation in Reasoning and either re-spawns the subagent or proceeds with the flag visible to the caller.
