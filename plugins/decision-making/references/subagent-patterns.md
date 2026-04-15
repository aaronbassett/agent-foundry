# Subagent spawning patterns

This file is shared by every command in the decision-making plugin that spawns subagents. Centralising the guidance keeps seven commands from drifting on prompt style, keeps the good-faith rules enforced consistently, and gives command authors a single place to check when they change how a technique fans out. When a command's spawn prompts diverge from this file, update the command — not this file.

## Assigning a perspective

The assigned perspective is the single most important thing the subagent needs to know, so it goes first. Burying the stance in the middle of the prompt gives the subagent paragraphs of framing to condition on before it sees what it is supposed to argue, and that framing almost always leaks into the output.

- State the assigned perspective in the second sentence of the prompt. The first sentence names the task ("You are arguing one side of a decision."); the second sentence commits the stance ("Your assigned position is: adopt option A."). Nothing goes between them.
- Do not include disclaimers like "consider the other side" or "steelman the opposing view." Isolated advocates commit. The main thread handles opposition by spawning a separate advocate for the other side — not by asking one subagent to split itself in half.
- Do not ask the subagent to "be balanced." Balance is the main thread's job. A subagent asked to be balanced produces mush; a subagent asked to commit produces something the main thread can weigh against another committed position.
- Include only the context the subagent needs to argue its assigned stance. Extraneous context dilutes the stance and invites the subagent to re-litigate the framing instead of defending the position. If a fact is not load-bearing for the assigned perspective, leave it out.

## Parallel fan-out

Techniques that spawn multiple independent subagents (calibration, council, pre-mortem, and the per-option advocates of adversarial) must fan out concurrently, not sequentially. Sequential spawning is slower, burns more tokens on accumulated context, and — worst — lets earlier subagents' outputs contaminate later ones when the main thread accidentally includes them in the next prompt.

- Use a single assistant message with multiple Agent tool-use blocks. The Claude Code runtime executes tool-use blocks in one message concurrently; separate messages execute sequentially. One message, many blocks.
- Each subagent sees only its own assigned input. Do not pass sibling subagents' outputs, do not pass a running summary of what other subagents have said, and do not pass the main thread's in-progress synthesis. Each fan-out branch is its own sealed envelope.
- For techniques that depend on isolation — calibration (independent estimates), council (non-cross-contaminated viewpoints), pre-mortem (uncorrelated failure modes) — explicitly state in the spawn prompt that the subagent will not see other subagents' outputs and should not try to anticipate or complement them. Tell the subagent it is alone. Otherwise it will hedge as if it were on a committee.

## Multi-round stance (tribunal)

Tribunal is the one technique where the same subagent is invoked across multiple rounds (opening arguments, rebuttals, closing). Re-invoking a `general-purpose` subagent each round drifts toward equivocation — without a persistent character, the subagent reverts to its default balanced voice between rounds and the later rounds lose their edge. Tribunal therefore uses the custom `Advocate` subagent type, not `general-purpose`.

- Use the `Advocate` subagent type for every round of tribunal. The `Advocate` agent definition bakes in "stay in character across rounds," so the main thread does not need to re-prompt the stance every round — it is load-bearing in the agent's system prompt.
- When invoking an advocate in a later round, provide the accumulated context: the advocate's own prior arguments, the opposing advocate's rebuttals, and any questions the judge has raised. Do not start fresh. The advocate needs to know what it said, what was said against it, and what it is responding to, or the rebuttal rounds collapse into restatements of the opening.
- Do not ask the advocate to concede or soften between rounds. If the judge's questions expose a genuine weakness, the advocate acknowledges the weakness (good-faith rule 3) but does not abandon the position. Conceding the whole case is the judge's call, not the advocate's.

## Good-faith enforcement

Every spawn prompt in every command must carry the four good-faith rules from `verdict-format.md`:

1. no fabricated facts or citations
2. no straw-manning opposing positions
3. acknowledge genuine weaknesses when challenged
4. commit fully to the assigned perspective (no equivocation)

Enforce them like this:

- State the rules in every spawn prompt, not just in the agent definition. Redundancy is cheap, and some subagent types (`general-purpose`) do not have an agent definition to rely on. A one-line reminder at the bottom of every spawn prompt is the minimum.
- If the returned output violates a rule — fabricated citation, straw-man of the opposing stance, weaselly equivocation when asked to commit — the main thread has two choices: (a) re-spawn the subagent with a corrective follow-up that names the violation and asks for a revised output, or (b) proceed with the original output and flag the violation explicitly in the Reasoning section of the verdict. Pick (a) when the violation breaks the technique (a fabricated citation in calibration makes the estimate worthless); pick (b) when the violation is visible but the signal is still usable (a mild straw-man in adversarial's losing side does not change which side wins).
- Never silently discard a violating output. Either correct it or surface it. Swallowing violations is how the plugin's output contract becomes a lie.

## Common anti-patterns

Things not to do when writing a spawn prompt. Each of these has been observed to degrade output quality in practice.

- **Don't put the decision context before the assigned perspective.** The subagent reads its prompt sequentially and the first framing wins. If paragraphs of neutral decision context come before the stance, the subagent is already in balanced-analyst mode by the time you tell it to commit, and the stance lands as a soft preference rather than a hard assignment.
- **Don't ask the subagent to "produce a verdict."** The subagent produces *input* for the main thread's verdict. The main thread is the only place where the Verdict-format contract is assembled. A subagent that thinks it is producing the final verdict will compress its reasoning (because it thinks the output is for the caller) and will hedge (because it is simulating the main thread's balancing job). Tell the subagent it is producing raw material.
- **Don't pass `verdict-format.md` to the subagent.** The output contract is the main thread's responsibility, not the subagent's. Passing it down is how you get subagents that return pre-formatted Verdict / Confidence / Reasoning blocks that the main thread then has to tear apart and re-assemble. Subagents return unstructured argument, estimate, or critique; the main thread fits the contract around them.
