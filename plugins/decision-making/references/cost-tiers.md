# Cost tiers

Every decision-making command is classified as Low, Medium, or High cost. The router skill and each command's own documentation reference this file so plan authors and callers can make informed decisions about which technique to drop into a workflow.

## What drives cost

- **Number of subagent invocations** (fan-out count)
- **Number of rounds** (single-round vs multi-round deliberation)
- **Model used** (opus is the most expensive)
- **Length of each subagent's output** (a 150-word position is cheaper than a full Judgment block)

## Tier table

| Command | Tier | Fan-out | Rounds | Model | Notes |
|---|---|---|---|---|---|
| `tribunal` | High | N (1 per option) | up to 10 | opus | Fact-finding phase adds main-thread cost |
| `adversarial` | Medium | N (1 per option) | 1 | general-purpose default | Lightweight variant of tribunal |
| `red-team` | Medium | 1 | 1 | general-purpose default | One committed critic beats many shallow ones |
| `pre-mortem` | Medium | 5 (floor 3, no cap) | 1 | general-purpose default | `--depth` configurable |
| `council` | Medium | 4-6 | 1 | sonnet (Lens) | `--lenses` override available |
| `ladder-of-abstraction` | Low | 2 | 1 | general-purpose default | Climber + descender |
| `calibration` | Low | 3 (fixed) | 1 | general-purpose default | Fan-out not configurable |

## Guidance for plan authors

- **Drop Low-tier commands freely into plan steps** (`ladder-of-abstraction`, `calibration`).
- **Drop Medium-tier commands with awareness** of the cost (`adversarial`, `red-team`, `pre-mortem`, `council`).
- **Gate High-tier commands behind a condition** (`tribunal`). For example: "if `adversarial` returned Low confidence, then `tribunal`." Tribunal can burn significant tokens across its 10-round ceiling.

## Guidance for the router skill

When multiple techniques could plausibly apply, prefer the cheaper one unless the caller indicates high stakes or irreversibility. Escalate to the more expensive technique only when the cheaper one would leave the caller unable to decide.
