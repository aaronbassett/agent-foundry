---
name: lexisim:lexisim
description: >
  Design a writing voice through guided questioning — either from scratch or by
  emulating references — then generate a personalized writer skill and full writing
  assistant subagent. Takes ~20-25 minutes through a comprehensive questionnaire
  covering audience, reading level, emotional temperature, pacing, and anti-voice
  definition.
user-invocable: false
---

# Lexisim — Writing Style Designer

Design a writing voice through deep, structured questioning. Either build one from scratch through guided preference exploration, or start from reference samples and refine from there. The output is a ready-to-use writer skill and writing assistant agent tuned to the designed voice.

## Mode Check

If plan mode is active, exit it now using ExitPlanMode before starting this workflow. All lexisim commands run in execute mode.

## Why This Process Works

Shallow instructions like "write casually" or "be professional" collapse into generic output. Stylometry research shows that writing voice lives in the interplay of independent axes — sentence length variance, vocabulary register, punctuation fingerprints, information density, emotional temperature, and transition patterns. By probing each axis independently and then testing for coherence, this questionnaire produces voice profiles that are richer and more distinctive than any single-paragraph style description could achieve.

## Reference Files

All reference file paths are resolved from the `/generate` command output above. Use these exact paths — do not search or glob.

```
echo ${CLAUDE_PLUGIN_ROOT}/skills/lexisim/references/question-bank.md
echo ${CLAUDE_PLUGIN_ROOT}/skills/lexisim/references/reading-level-calibration.md
echo ${CLAUDE_PLUGIN_ROOT}/skills/lexisim/references/ai-tells.md
echo ${CLAUDE_PLUGIN_ROOT}/skills/lexisim/references/anti-voice-catalog.md
echo ${CLAUDE_PLUGIN_ROOT}/skills/lexisim/assets/writer-skill-template.md
echo ${CLAUDE_PLUGIN_ROOT}/skills/lexisim/assets/writer-agent-template.md
```

## Workflow Overview

```
Phase 1:  Entry Path & Setup            (~2 min)   → Choose path, name profile, set scope
Phase 2:  Reference Analysis             (~3 min)   → Emulate path only — analyze pasted samples
Phase 3:  Audience Persona               (~3 min)   → Who reads this, what they need
Phase 4:  Reading Level Calibration      (~4 min)   → 8 show-don't-tell comparison pairs
Phase 5:  Voice Character                (~4 min)   → Emotional temperature, pacing, structure
Phase 6:  Anti-Voice Definition          (~3 min)   → What this voice is NOT
Phase 7:  Implicit Influence Probe       (~1 min)   → Design path only — name influences
Phase 8:  Uncanny Valley Detection       (~3 min)   → Test paragraphs, collect reactions
Phase 9:  Data Extraction                (auto)     → Build structured handoff document
Phase 10: Analysis & Generation          (~1 min)   → Sub-agent analyzes + generates files
```

Total: ~20-25 minutes for a comprehensive voice profile.

## Isolation Rule

Work ONLY with data collected through this questionnaire. Do NOT:
- Search for writing samples on the user's machine
- Read other skills, profiles, or configuration files
- Look for documents, blog posts, or archives
- Reference any external material not collected in this session

Everything needed to build the voice profile comes from the user's responses to the prompts below.

---

## Phase 1: Entry Path & Setup

Present questions Q1-Q3 from the question bank (`references/question-bank.md` → Phase 1).

- **Q1** determines the entire flow: "Design from scratch" skips Phase 2 and includes Phase 7. "Emulate a reference" includes Phase 2 and skips Phase 7.
- **Q2** (free text): Store as `PROFILE_NAME`. Convert spaces to lowercase kebab-case.
- **Q3**: Store as `SCOPE`. Resolve output paths — project scope writes to `.claude/skills/` and `.claude/agents/` in the current working directory; user scope writes to `~/.claude/skills/` and `~/.claude/agents/`.

---

## Phase 2: Reference Analysis (Emulate Path Only)

_Skip this phase entirely if `ENTRY_PATH` is "Design from scratch". Proceed directly to Phase 3._

Present questions Q4-Q6 from the question bank (`references/question-bank.md` → Phase 2).

When the user provides samples (Q4), perform lightweight stylometric analysis on each:
- Count sentences and calculate mean/stdev of sentence length
- Note vocabulary register (formal/informal/technical/conversational)
- Identify punctuation patterns (em-dash frequency, parenthetical rate, semicolons, exclamation density)
- Measure sentence length variance (burstiness)
- Note contraction rate, first-person frequency, opening patterns

Store both the verbatim samples and the analysis results.

Q5 reveals which dimensions of the reference the user is drawn to versus which are incidental. Use it to weight the Q4 analysis — amplify the dimensions the user calls out, treat uncalled dimensions as secondary.

If the user selects "Add more influences" in Q6, loop back to Q4 and Q5 for additional references. Cap at 3 total reference sets to avoid dilution.

---

## Phase 3: Audience Persona

Present questions Q7-Q10 from the question bank (`references/question-bank.md` → Phase 3).

After collecting all answers, synthesize a brief audience persona summary and confirm
with the user: "Here's who we're writing for: [summary]. Sound right?"
Use AskUserQuestion with options: "Yes, that's right" / "Close, but let me adjust".

Cross-reference Q8 (knowledge level) with Q9 (reader frustrations) — frustrations
often reveal implicit knowledge level assumptions. If the user wants to adjust, collect the correction as free text and update the synthesized persona before proceeding.

---

## Phase 4: Reading Level Calibration

Read the reference file `references/reading-level-calibration.md` for the 8 example pairs.

Present Q11-Q18 from the question bank (`references/question-bank.md` → Phase 4). For each pair, show both Version A and Version B in full from the calibration file, then present the AskUserQuestion.

Each dimension is tested twice. Average the two responses per dimension:
- Both "Version A" = strong preference for the simpler end
- Both "Version B" = strong preference for the complex end
- Split or "Somewhere between" = moderate/middle preference

Build a 4-axis reading level profile:
- **Vocabulary**: simple <-> technical
- **Syntax**: short/direct <-> nested/complex
- **Density**: few ideas per passage <-> many ideas per passage
- **Scaffolding**: high (explains why) <-> low (just the facts)

### Cross-Reference with Audience Persona

After all 8 pairs, cross-reference the reading level profile with the audience persona from Phase 3. Flag contradictions and surface them to the user. Common tensions:

- **Expert audience + high scaffolding preference**: "You're writing for experts but prefer writing that explains the 'why' behind things. Should we assume expertise on the domain but still provide reasoning for decisions and recommendations?"
- **Beginner audience + low scaffolding preference**: "You're writing for beginners but prefer writing that gets straight to the facts. Should we define terms but skip the hand-holding on concepts?"
- **Scanning readers + high density preference**: "Your readers skim, but you prefer information-dense writing. Should we use dense prose but with strong structural signposts (headings, bold key terms, front-loaded paragraphs)?"

For the **Emulate path**: also compare these preferences against the empirical analysis of reference samples from Q4. If the reference samples sit at a different reading level than the stated preferences, note this — it indicates the user wants to adjust the reference rather than replicate it exactly.

---

## Phase 5: Voice Character

Transitional message:

> Now let's get into the personality of this voice — how it sounds, how it moves, how it opens.

Present questions Q19-Q24 from the question bank (`references/question-bank.md` → Phase 5).

For Q21 (Sentence Structure), this is a show-don't-tell question — present the three preview paragraphs from the question bank before the AskUserQuestion options.

After collecting all voice character answers:

> Great, that gives me a clear picture of the voice character. Now let's define what this voice is NOT — sometimes the boundaries matter more than the center.

---

## Phase 6: Anti-Voice Definition

Read the reference file `references/ai-tells.md` for archetype descriptions.

Present questions Q25-Q27 from the question bank (`references/question-bank.md` → Phase 6).

For Q25 (Anti-Voice Archetypes): after the user selects their rejected archetypes, read `references/anti-voice-catalog.md` and expand each selected archetype to its full list of forbidden phrases, structures, and patterns. Store the expanded pattern lists. If the user selected "The AI Default" archetype in Q25, consider pre-selecting all Q26 options and asking the user to confirm or deselect any they're actually fine with.

After Q26, also ask as free text for any additional banned words or phrases.

### Tension Detection

After collecting all anti-voice answers, read the Tension Detection section from `references/anti-voice-catalog.md`. Check ALL collected answers from Phases 3-6 against the tension table.

Compare the user's positive voice choices (emotional temperature, pacing, audience, etc.) against their anti-voice rejections. The common tensions to check include:

- "Warm and approachable" + rejected "The LinkedIn Thought Leader" or similar warmth-based archetypes
- "Expert audience" + rejected complexity dimensions
- "Passionate and energetic" + rejected "The Hype Machine"
- "Cool and precise" + rejected "The Textbook"
- "Conversational" formality + rejected casual dimensions
- "Authoritative" stance + rejected lecturing dimensions
- "Opinionated" + rejected "The Edgy Contrarian"

If tensions are found, surface them **one at a time** using the resolution questions from the tension table. For each tension:

1. Acknowledge both choices as valid — the user is not confused, they are expressing a nuanced preference.
2. Explain the tension plainly — name the specific overlap.
3. Ask the resolution question from the table (or formulate one that names the shared element and offers two interpretations).
4. Record the resolution as a calibration note for the handoff document.

Do NOT silently resolve tensions. The resolved tension is one of the most valuable outputs of the entire questionnaire.

---

## Phase 7: Implicit Influence Probe (Design Path Only)

_Skip this phase if `ENTRY_PATH` is "Emulate a reference". Proceed directly to Phase 8._

Present Q28 from the question bank (`references/question-bank.md` → Phase 7).

If the user names a specific source or pastes samples, perform the same lightweight stylometric analysis as Phase 2. Store the results as influence data for the handoff document.

If the user says "nothing comes to mind," accept it and move on. Do not push for an answer.

---

## Phase 8: Uncanny Valley Detection

This phase is not a traditional question — it is a generative test-and-refine loop. The main agent (not a sub-agent) generates test content because it has the full conversation context.

### Step 1: Generate Test Paragraphs

Using ALL collected data from Phases 1-7, generate 2-3 short paragraphs (3-5 sentences each) that demonstrate the designed voice applied to a realistic topic. Choose a topic relevant to the user's stated audience (Q7) and domain context.

Each paragraph should exercise different aspects of the voice:

1. **Casual/conversational** — Tests warmth, rhythm, vocabulary at informal register. A paragraph about a common frustration or everyday observation in the user's domain.
2. **Explanatory/technical** — Tests reading level axes, scaffolding, concept density. A paragraph explaining a concept to the stated audience.
3. **Opinionated/persuasive** — Tests emotional temperature, personal voice, conviction. A paragraph arguing a position relevant to the user's domain.

### Step 2: Present to the User

Show all paragraphs and ask as free text (not `AskUserQuestion`):

> Here are three samples of what this voice sounds like in practice. Read them and tell me: what feels right, what feels off, and what's missing? Be specific — "the tone in paragraph 2 is too aggressive" is more useful than "it's not quite right."

### Step 3: Collect and Categorize Feedback

Parse the user's feedback into adjustment categories:
- **Tone adjustments**: Emotional temperature too hot/cold, too formal/casual
- **Structural adjustments**: Sentences too long/short, pacing too fast/slow, too much/little scaffolding
- **Vocabulary adjustments**: Too technical/simple, wrong register, specific words that feel off
- **Pattern violations**: Specific phrases or structures that trigger the uncanny valley
- **Missing elements**: Things the user expected to see that aren't present

### Step 4: Iterate If Needed

If the feedback is substantial (more than minor tweaks), regenerate the test paragraphs incorporating adjustments and present again. Cap at 3 iterations — if the voice isn't landing after 3 rounds, earlier phases may have internal conflicts that need explicit resolution.

### Step 5: Confirm and Proceed

When the user is satisfied (or close enough), confirm:

> Are you happy with this voice, or do you want to adjust anything before I generate the skill files?

Record ALL feedback from this phase as calibration notes. Phase 8 feedback is the highest-priority calibration signal — it overrides earlier questionnaire answers when they conflict, because it represents the user's reaction to actual output rather than their prediction of what they'd want.

---

## Phase 9: Data Extraction

This step is critical. Before delegating to a sub-agent, compile all collected data into a single structured handoff document. This keeps the sub-agent's context clean and focused.

Tell the user:

> I've got everything I need. Give me a moment to analyze and generate your voice profile.

### Handoff Document Structure

Build the following document by extracting from the conversation. Copy writing samples and free-text responses VERBATIM — do not summarize, clean up, or paraphrase.

```markdown
# Lexisim Data: {PROFILE_NAME}

## Config
- Profile name: {PROFILE_NAME}
- Entry path: {ENTRY_PATH}
- Scope: {SCOPE}
- Output skill path: {resolved path}
- Output agent path: {resolved path}
- Date: {DATE}

## Reference Samples (if emulate path)
{verbatim pasted samples from Q4}
{lightweight analysis results — sentence metrics, vocabulary register, punctuation fingerprint}

## What User Likes About References (if emulate path)
{verbatim response to Q5}

## Influence Blending (if emulate path)
{Q6 response and any additional references}

## Audience Persona
- Audience type: {Q7 answer}
- Knowledge level: {Q8 answer}
- Reader frustrations: {Q9 answer verbatim}
- Time budget: {Q10 answer}
- Synthesized persona: {the confirmed summary from Phase 3}

## Reading Level Calibration
- Q11 (Vocab Pair 1 — Caching strategy): {A/B/between}
- Q12 (Vocab Pair 2 — API rate limiter): {A/B/between}
- Q13 (Syntax Pair 1 — Feature flag deployment): {A/B/between}
- Q14 (Syntax Pair 2 — Database index): {A/B/between}
- Q15 (Density Pair 1 — Microservices latency): {A/B/between}
- Q16 (Density Pair 2 — Load balancer): {A/B/between}
- Q17 (Scaffold Pair 1 — Environment variables): {A/B/between}
- Q18 (Scaffold Pair 2 — Pull request workflow): {A/B/between}
- 4-axis profile:
  - Vocabulary: {simple/moderate/technical}
  - Syntax: {direct/moderate/complex}
  - Density: {low/moderate/high}
  - Scaffolding: {high/moderate/low}

## Voice Character
- Emotional temperature: {Q19 answer}
- Pacing: {Q20 answer}
- Sentence structure: {Q21 answer}
- Transition style: {Q22 answer}
- Opening style: {Q23 answer}
- Personal voice: {Q24 answer}

## Anti-Voice
- Rejected archetypes: {Q25 selections}
- Rejected AI patterns: {Q26 selections}
- Additional rejected phrases: {Q26 freeform additions}
- Emoji preference: {Q27 answer}
- Expanded pattern list: {all forbidden phrases, structures, and patterns from rejected archetypes via anti-voice-catalog}

## Influences (design path — if provided)
{Q28 response}
{analysis results if any samples were provided}

## Influences (emulate path)
{Q4-Q6 responses and analysis}

## Platform Preferences
{Inferred from audience persona, content type context, and voice character. The style-analyzer should adapt voice guidance for common platforms: social media (short-form), blog (long-form), documentation (reference), email (direct). If the user mentioned specific platforms during the questionnaire, note them here. Otherwise, leave as "Not specified — infer from voice character and audience."}

## Tension Resolutions
{each tension surfaced, the resolution question asked, the user's response, and the calibration note derived}
{or "None detected" if no tensions found}

## Uncanny Valley Feedback
- Test paragraph 1 (casual/conversational): {paragraph text}
  → Feedback: {user feedback verbatim}
- Test paragraph 2 (explanatory/technical): {paragraph text}
  → Feedback: {user feedback verbatim}
- Test paragraph 3 (opinionated/persuasive): {paragraph text}
  → Feedback: {user feedback verbatim}
- Iteration notes: {any adjustments made across iterations}

## Cross-Reference Notes
{any conflicts detected between phases and how they were resolved}

## Freeform Notes
{any additional instructions or preferences the user volunteered during the questionnaire that don't fit the categories above — copy verbatim}
{or "None" if nothing extra was provided}
```

**Important**: Copy ALL data verbatim. The sub-agent needs raw text for accurate analysis. Do not paraphrase or editorialize.

---

## Phase 10: Analysis & Generation (Sub-Agent)

Use the `Agent` tool to spawn the style-analyzer sub-agent with the handoff document.

### Launch the Sub-Agent

```
Agent(
  subagent_type: "style-analyzer",
  description: "Analyze style + generate writer skill and agent",
  prompt: "[INSERT FULL HANDOFF DOCUMENT FROM PHASE 9]

  TEMPLATE AND REFERENCE FILES TO READ:
  - Writer skill template: [resolved path to assets/writer-skill-template.md]
  - Writer agent template: [resolved path to assets/writer-agent-template.md]
  - AI tells catalog: [resolved path to references/ai-tells.md]
  - Anti-voice catalog: [resolved path to references/anti-voice-catalog.md]

  OUTPUT LOCATIONS:
  - Writer skill: [resolved output skill path]/{PROFILE_NAME}-writer/SKILL.md
  - Writer agent: [resolved output agent path]/{PROFILE_NAME}-writer.md
  "
)
```

The style-analyzer agent file contains all analysis and generation instructions.
Do NOT include analysis steps in this prompt — let the agent handle them.

### After Sub-Agent Completes

Verify the output files were created:
- `{resolved skill path}/{PROFILE_NAME}-writer/SKILL.md` should exist
- `{resolved agent path}/{PROFILE_NAME}-writer.md` should exist

If either file is missing, report the issue to the user rather than attempting to regenerate in the main context.

Report to the user:

> Your writing style has been generated! Two files created:
>
> - **Writer skill**: {skill path}/{PROFILE_NAME}-writer/SKILL.md
> - **Writing assistant**: {agent path}/{PROFILE_NAME}-writer.md
>
> The writing assistant can draft, revise, critique, and adapt content in the {PROFILE_NAME} voice. Try it by asking it to write something.

---

## Error Handling

- **User wants to skip a question**: Let them. Note the gap in analysis and compensate with extra weight on available data.
- **Very short responses**: Gently encourage more detail: "Could you write a couple more sentences? Even a few more words helps me calibrate the voice." Do not push more than once.
- **User seems frustrated with the process**: Offer to skip ahead: "We can skip the remaining questions and work with what we have. I'll have less data but can still build a useful profile."
- **Analysis uncertainty**: When patterns are ambiguous, flag it in the profile rather than guessing. Let the uncanny valley test (Phase 8) resolve ambiguity.
- **Reference samples too short**: If emulate-path samples are under 100 words total, warn that results will be less precise and suggest adding more. Accept whatever the user provides.

## Conversation Style

This skill should feel like a conversation, not a form. Between phases:
- Acknowledge answers and react naturally: "Interesting — cool-and-precise with heavy personal voice is a distinctive combination."
- Build on what the user says: reference earlier answers when introducing new questions.
- Keep transitional messages brief — one sentence, occasionally two.
- Do not repeat back every answer verbatim during the conversation (save that for the handoff document).

## Conflict Resolution Priority

When inputs from different phases disagree, prioritize in this order:

1. **Phase 8 feedback** — User reacting to actual output (highest signal)
2. **Phase 4 reading level calibration** — Show-don't-tell is more reliable than stated preference
3. **Phase 3 audience constraints** — Audience needs override personal preference
4. **Phase 5-6 stated preferences** — Explicit design choices
5. **Phase 2 reference analysis** — Empirical baseline (if available)

The exception is **anti-patterns (Phase 6)**: these are hard constraints that override everything. If the user says "never do X," the voice never does X, regardless of what other signals suggest.
