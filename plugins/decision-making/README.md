# decision-making

Seven structured decision-making techniques that exploit the subagent architecture to produce verdicts plan steps can branch on. Every technique earns its place by needing isolated parallel contexts that a single context can't replicate — techniques that would just be checklists are deliberately excluded. Commands are designed for cross-referencing from plans, with verdict lines prescribed at the token level so plan steps can branch reliably.

## The seven techniques

| Command | Cost | For |
|---|---|---|
| `/decision-making:tribunal` | High | Heavyweight deliberation: fact-finding, parallel advocates, rebuttals, up to 10 rounds. Use for load-bearing, hard-to-reverse decisions. |
| `/decision-making:adversarial` | Medium | Lightweight one-shot: steelmanned advocates for each option, one round. Use for reversible or moderate-stakes tiebreaks. |
| `/decision-making:red-team` | Medium | Adversarial stress test of a proposed plan. Verdict is `accept` \| `revise` \| `reject`. |
| `/decision-making:pre-mortem` | Medium | 5 subagents (configurable) write concrete failure narratives for a tentative decision. Surfaces load-bearing failure modes. |
| `/decision-making:council` | Medium | 4-6 `Lens` subagents (or `--lenses=<list>`) inhabit distinct perspectives; main thread synthesizes convergence and conflict. |
| `/decision-making:ladder-of-abstraction` | Low | Two subagents (climber, descender) reframe the question up and down. Use when framing feels wrong. |
| `/decision-making:calibration` | Low | 3 independent estimators on a quantitative question. Confidence derived from spread. |

## The routing skill

When you don't already know which technique fits, the `skills/route/SKILL.md` rubric triages the question: it asks about stakes, reversibility, whether framing is in doubt, whether the output is quantitative, and whether you need failure-mode coverage versus perspective coverage, then points at the right command. Use it interactively when a human is steering. Plan steps should bypass routing and invoke commands directly — plans commit to a specific technique up front so that verdict branches are stable and reviewable.

## Using decision-making commands in plans

Plans cross-reference decision-making commands by slash-command name. Each command's Verdict section uses a prescribed, stable token (`accept`/`revise`/`reject` for `red-team`, option names for `tribunal` and `adversarial`, and so on), which means plan steps can reliably branch on the exact verdict line without parsing free-form prose. Treat the command invocation as the step's "gate" and the verdict as the gate's output.

Example plan step:

```markdown
### Step 7 — verify readiness

Run `/decision-making:red-team` on the migration plan from step 6.

If the verdict is `accept`, proceed to step 8.
If the verdict is `revise`, return to step 6 and address the top 3
load-bearing weaknesses from the Reasoning section.
If the verdict is `reject`, stop and escalate to the user.
```

See the chaining idioms section of `skills/route/SKILL.md` for patterns that compose multiple techniques (e.g., `ladder-of-abstraction → adversarial`, `red-team → pre-mortem`, `council → tribunal`).

Two anti-patterns to avoid:

- **Don't cross-reference `tribunal` casually.** It's expensive and slow. Gate it behind an explicit condition — for example, "if the adversarial verdict is split or the stakes exceed X, then run tribunal" — never as a default step.
- **Don't chain `red-team` on its own output.** Re-running `red-team` on a plan that just survived `red-team` produces diminishing returns. Use `red-team → pre-mortem` instead: red-team catches structural weaknesses, pre-mortem catches the failure modes that remain once the structure is sound.

## Plugin layout

```
plugins/decision-making/
├── .claude-plugin/plugin.json
├── README.md
├── commands/
│   ├── tribunal.md
│   ├── adversarial.md
│   ├── red-team.md
│   ├── pre-mortem.md
│   ├── council.md
│   ├── ladder-of-abstraction.md
│   └── calibration.md
├── skills/
│   └── route/
│       └── SKILL.md
├── agents/
│   ├── advocate.md
│   └── lens.md
└── references/
    ├── verdict-format.md
    ├── subagent-patterns.md
    └── cost-tiers.md
```

## Custom subagent types

Two techniques use dedicated subagent types; the other five use `general-purpose` subagents with technique-specific prompts.

- **`Advocate`** — used by `tribunal`. Bakes the multi-round stance into the agent definition so an advocate stays committed to its assigned option across rounds of arguments, rebuttals, and judge questions. Without a dedicated type, stance drift across rounds destroys the adversarial signal.
- **`Lens`** — used by `council`. Enforces non-cross-contamination at the agent level so each lens inhabits its assigned perspective (security, ops, UX, cost, etc.) without leaking framing from other lenses. Launching lenses in parallel with no shared context is what makes convergence and conflict meaningful when the main thread synthesizes them.
- **`general-purpose`** — used by `adversarial`, `red-team`, `pre-mortem`, `ladder-of-abstraction`, and `calibration`. These techniques don't need stance persistence across rounds or perspective isolation beyond what a prompt can enforce, so a custom agent type would be overhead with no benefit.

## Non-goals

v1 deliberately excludes:

- No hooks (cost gates, pre-command confirmation, etc. — add at the plan level if needed)
- No persistent decision logging, journal, or index
- No multi-session deliberation (tribunal cannot be paused and resumed across sessions)
- No structured / JSON input-output schemas — free-form prose arguments, markdown output with stable headings
- No custom subagent types beyond `Advocate` and `Lens`
- No auto-routing via hidden heuristics — the router skill is an explicit rubric
- No metrics / telemetry on technique usage
- No comparative-technique meta-command (e.g., "run adversarial and tribunal on the same question and diff")
- Confidence calibration beyond verbal High/Medium/Low is done by `calibration`, not by other commands

## License

MIT. See [LICENSE](../../LICENSE) in the repo root.
