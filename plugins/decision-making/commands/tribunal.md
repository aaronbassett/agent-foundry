---
description: Heavyweight adversarial deliberation with fact-finding, parallel advocates, rebuttals, judge questions, and up to 10 iteration rounds. Use for load-bearing, hard-to-reverse decisions.
argument-hint: "[decision description and options, or a fuzzy question]"
---

# /decision-making:tribunal

## When to use

Use `tribunal` when you have N≥2 concrete options on the table, the decision is load-bearing and hard to reverse, and you want rigorous deliberation — including rebuttals, judge questions, and a pre-judgment disclosure — before committing. Tribunal is heavier than other techniques in the plugin because it spawns parallel advocates, runs multiple rounds, and interrogates its own conclusions. Pay that cost only when the decision warrants it.

Escalate from `adversarial` to `tribunal` when the stakes justify the extra cost: irreversible migrations, architecture choices that lock in future work, hiring and team-shape decisions, vendor lock-in, or anything you will have to live with for a long time. Tribunal is the only technique in v1 that offers an honest "unable to decide" escape hatch — if the options are genuinely equivalent, or if the decision depends on information you do not have, the tribunal can and should say so rather than fabricating a verdict.

## Cost tier

High. Up to 10 rounds × N advocates × opus model + fact-finding phase. Gate behind a condition when referencing from plan steps. See `references/cost-tiers.md`.

## Input

A decision description and optional list of options. If options are unclear, enter fact-finding and ask 3-5 clarifying questions before spawning advocates.

## Workflow

1. **Parse the decision** — identify what is being decided, what the options are (minimum 2, no maximum), what criteria matter, and what context is relevant. If options are unclear, ask the user to enumerate them explicitly and confirm you have understood. Output: a clear list of N options to deliberate.

2. **Fact-finding** — probe for constraints (budget, timeline, technical limitations), context (why now, what prompted it), history (what has been tried, what has been ruled out), stakeholders (who else is affected, what are their preferences), non-negotiables (must-haves vs nice-to-haves), and success criteria (how will you know the decision was correct). Ask 3-5 clarifying questions. Conclude fact-finding when you understand the decision's importance and urgency, know the key constraints advocates must work within, and could explain the decision context to a colleague. More than 10 questions suggests the decision isn't ready for deliberation.

3. **Spawn advocates in parallel** — use the Agent tool with `subagent_type: advocate` (the custom type from `agents/advocate.md`). One advocate per option. Each is given only its assigned option + decision context + criteria + background. Use this exact prompt template:

   ```
   You represent: [OPTION]

   Decision context: [WHAT IS BEING DECIDED]

   Relevant criteria: [WHAT MATTERS FOR THIS DECISION]

   Background: [CONTEXT FROM FACT-FINDING]

   Present your initial argument for why [OPTION] is the best choice.
   Follow the good-faith rules in your agent definition.
   ```

   Collect initial arguments from all advocates in parallel.

4. **Rebuttal round (parallel)** — share all initial arguments with all advocates. Each advocate responds with rebuttals. Use this exact prompt template:

   ```
   You represent: [OPTION]

   Here are the arguments made by all advocates:

   [ADVOCATE 1 - OPTION A]:
   [argument]

   [ADVOCATE 2 - OPTION B]:
   [argument]

   ...

   Present your rebuttal. Address the strongest points made against your
   option and counter the arguments made for competing options. Stay in
   character.
   ```

   Collect rebuttals in parallel.

5. **Judge questions (optional)** — as judge (the main thread), you may ask questions to probe weaknesses, request clarification, test how advocates handle challenges, and explore edge cases. Use this exact prompt template:

   ```
   You represent: [OPTION]

   The judge asks: [QUESTION]

   Respond directly and honestly, in character.
   ```

   You may question one advocate, several, or all.

6. **Pre-judgment disclosure** — before rendering judgment, explain your current thinking: which way you are leaning, what reasoning drives it, and what concerns remain. Then give advocates a final opportunity to respond. Use this prompt template:

   ```
   You represent: [OPTION]

   The judge is leaning toward [OTHER OPTION] for the following reasons:
   [REASONING]

   This is your final opportunity to make your case. Respond to the
   judge's reasoning.
   ```

   Collect final arguments in parallel.

7. **Iterate or conclude** — after final arguments, either return to step 5 (if new questions arose, more information is needed, or an advocate raised something worth exploring) or proceed to judgment. **Iteration limit: 10 rounds maximum.** A round is one cycle through steps 4-6. If you hit the 10-round iteration limit without convergence, proceed to judgment with whatever clarity you have — including, if warranted, an "unable to decide" verdict.

8. **Render judgment** — produce the verdict block. The Reasoning section contains: the recommendation, primary reasoning (2-3 most important factors), trade-offs, confidence level, and key factors. If the decision cannot be made (options genuinely equivalent, critical information unavailable, or the choice depends on user preferences you cannot infer), produce the "Unable to decide" ending with the central unknown captured in "What would change this verdict."

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line = the chosen option name, OR `Unable to decide — [one-sentence reason]`.

## Good-faith requirements

All spawned advocates are instances of the `Advocate` subagent type (`agents/advocate.md`), which enforces the good-faith rules in its definition. Additionally, the main thread must follow the subagent spawning patterns in `references/subagent-patterns.md`.
