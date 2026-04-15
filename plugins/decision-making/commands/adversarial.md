---
description: Lightweight one-shot adversarial deliberation. Spawns steelmanned advocates for each option in parallel, then renders a verdict. Use for quick tiebreaks on reversible decisions.
argument-hint: "[decision description and N≥2 options]"
---

# /decision-making:adversarial

## When to use

Use this command when you already have N≥2 concrete options and want a quick
tiebreak with steelmanned briefs. It is intended for reversible or
moderate-stakes decisions where a single round of advocacy is enough to
surface the strongest case for each option.

Escalate to `/decision-making:tribunal` instead if you want rebuttals,
iteration, multi-round fact-finding, or an honest "unable to decide" escape
hatch. `adversarial` is explicitly lightweight — one round, no rebuttals, no
judge questions.

## Cost tier

Medium. N parallel `general-purpose` subagents, one round, no iteration. See `references/cost-tiers.md`.

## Input

A decision description plus an explicit list of N≥2 options. If the caller's
arguments do not contain a clear decision and at least two options, ask once
and only once for them. No multi-round fact-finding — that is tribunal's job.
Lightweight means lightweight.

## Workflow

1. **Parse options** — extract N options from the caller's arguments. If they
   are missing, ask the user once for a decision description and the explicit
   list of options. If the user still does not provide them, produce an error
   message recommending `/decision-making:tribunal` for fuzzy decisions that
   need multi-round fact-finding.

2. **Spawn advocates in parallel** — spawn one `general-purpose` subagent per
   option, all in parallel in a single tool-call batch. Each subagent is given
   ONLY its assigned option plus the shared decision context — never the
   competing options' briefs. Use this exact prompt template, substituting the
   bracketed slots:

   ```
   You represent: [OPTION]

   Decision context: [WHAT IS BEING DECIDED]

   Background: [ANY CONTEXT THE USER PROVIDED]

   Present the strongest possible steelmanned case for why [OPTION] is
   the best choice. Anticipate the most likely rebuttals and address
   them pre-emptively. Aim for 200-400 words.

   Good-faith rules: no fabricated facts, no straw-manning competing
   options, acknowledge genuine weaknesses honestly, commit fully to
   [OPTION] without equivocation.
   ```

3. **Render verdict** — the main thread reads all briefs, identifies the
   strongest and weakest points of each, and renders the verdict directly. No
   rebuttal round. No iteration. No judge questions. One round, done.

## Output format

Produce a verdict block conforming to `references/verdict-format.md`. Verdict line = the chosen option name.

## Good-faith requirements

All spawned subagents must follow the four good-faith rules stated in `references/verdict-format.md` and the spawning guidance in `references/subagent-patterns.md`. The prompt template above states the rules inline — do not omit them.
