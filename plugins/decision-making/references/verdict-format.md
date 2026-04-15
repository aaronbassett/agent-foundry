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
