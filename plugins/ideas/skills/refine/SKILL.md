---
name: ideas:refine
description: This skill should be used when the user wants to sharpen, distill, or pressure-test an existing idea. Triggers include "refine this idea", "what's the core of this", "help me cut this down", "is this idea any good", "challenge this idea", "help me decide if this is worth pursuing", "strip this back", "what's essential here", or when an idea has too many features and needs focus.
---

# Refine: Cutting to the Heart of an Idea

## Overview

Strip ideas down to their irreducible core. Where ideation expands
the possibility space, refinement contracts it - ruthlessly removing
everything that isn't essential until only the idea's true heart
remains. The output is a sharp, focused brief that captures what
matters and explicitly discards what doesn't.

<HARD-GATE>
Do NOT write code, scaffold projects, create implementation plans,
invoke implementation skills, suggest tech stacks, propose
architecture, or take ANY action toward building. This skill
produces a refined brief. Implementation decisions happen later.
</HARD-GATE>

## When to Use

- User has an idea with too many features or directions
- An existing vision doc or concept needs sharpening
- User is uncertain whether an idea is worth pursuing
- User wants hard pushback to test their conviction
- Scope has crept and needs to be cut back to essentials

## When NOT to Use

- User has no idea yet (use ideation first to explore)
- User wants to expand possibilities, not contract them
- User is ready to build and needs an implementation plan

## Adaptive Intensity

Match the refinement intensity to how the user frames their
request. Detect the appropriate mode from their language:

**Ruthless mode** - Triggered by: "challenge this", "don't hold
back", "tear this apart", "be brutal", "convince me this is bad"
- Actively argue against every feature
- Force impossible trade-offs
- Accept nothing as sacred
- Default assumption: this feature should be cut unless proven
  essential

**Firm mode** (default) - Triggered by: "help me refine", "sharpen
this", "improve this idea", "cut the chaff"
- Challenge strongly but respect conviction
- Push for hard choices while acknowledging good instincts
- Default assumption: prove each feature earns its place

**Socratic mode** - Triggered by: "help me decide", "I'm not sure
about this", "is this worth it", "what do you think"
- Ask pointed questions that lead to self-discovery
- Surface contradictions gently
- Help the user find their own clarity
- Default assumption: the user already knows what to cut but
  needs help seeing it

When uncertain, use AskUserQuestion to confirm:

```
question: "How hard should I push on this idea?"
options:
  - label: "Be ruthless"
    description: "Argue against everything - only what survives deserves to stay"
  - label: "Be firm (Recommended)"
    description: "Challenge me, but respect my conviction when I push back"
  - label: "Help me think"
    description: "Ask questions that help me find clarity myself"
```

## Checklist

Create a task for each item and complete in order:

1. **Understand the current idea** - read any existing docs, ask
   for a summary, identify the scope
2. **Detect intensity mode** - determine ruthless/firm/socratic
   from user's framing
3. **Find the one-sentence core** - force the idea down to a
   single sentence
4. **Challenge every element** - pressure-test each feature,
   audience claim, and assumption
5. **Force prioritization** - make the user choose what to keep
   and what to kill
6. **Write refined brief** - save to
   `docs/ideas/YYYY-MM-DD-<topic>-refined.md`

## Process

### Phase 1: Intake (1-2 exchanges)

Establish what's being refined. Check for existing vision docs in
`docs/ideas/`. If one exists, read it. If not, ask the user to
describe the idea.

Use AskUserQuestion to establish the starting point:

```
question: "What are we refining today?"
options:
  - label: "An existing vision doc"
    description: "There's a document in docs/ideas/ from a previous ideation session"
  - label: "An idea in my head"
    description: "I'll describe it - no written docs yet"
  - label: "A feature list that's too long"
    description: "I have too many features and need to cut"
  - label: "A concept I'm unsure about"
    description: "I need help deciding if this is worth pursuing at all"
```

### Phase 2: The One-Sentence Test (2-3 exchanges)

Force the idea into a single sentence. This is the hardest and
most important step. If the idea cannot be expressed in one clear
sentence, it is not yet understood.

Use AskUserQuestion to drive toward clarity:

```
question: "In one sentence, what is this idea?"
options:
  - label: "It's [X] for [audience] that [value]"
    description: "A product/service framing"
  - label: "It solves [problem] by [approach]"
    description: "A problem/solution framing"
  - label: "I can't say it in one sentence"
    description: "That's exactly what we need to fix"
```

If the user selects "I can't say it in one sentence," that is the
most important signal. The refinement process begins there.

**Techniques for finding the core:**
- Ask "If this idea could only do ONE thing, what would it be?"
- Ask "Who is the ONE person this is for?"
- Ask "What is the ONE problem this solves?"
- If the user says "but it also..." - that's chaff. Note it,
  set it aside, return to the one thing.

### Phase 3: The Chopping Block (3-5 exchanges)

Systematically challenge every element of the idea. Adapt approach
to the detected intensity mode.

**For each feature or element, use AskUserQuestion:**

```
question: "Does [Feature X] survive the cut?"
options:
  - label: "Essential - can't ship without it"
    description: "Remove this and the core value proposition breaks"
  - label: "Important but not essential"
    description: "Adds real value but the idea works without it"
  - label: "Nice to have"
    description: "Would be great eventually but isn't the point"
  - label: "Kill it"
    description: "Doesn't belong - was scope creep or wishful thinking"
```

**In ruthless mode:** Argue against "essential" selections.
Demand proof. "You said this is essential - what breaks without
it? Be specific." If the answer is vague, downgrade it.

**In firm mode:** Accept "essential" when the user can articulate
why in one sentence. Push back on "important but not essential" -
challenge whether it should be killed entirely.

**In socratic mode:** Ask "What would happen if we removed this?"
and let the user discover whether it matters. Follow up with
"And would that be a problem?" to surface hidden assumptions.

Use multiSelect for batch prioritization:

```
question: "Pick ONLY the 3 features that matter most. Everything else gets cut."
multiSelect: true
options:
  - label: "[Feature A]"
    description: "Brief description"
  - label: "[Feature B]"
    description: "Brief description"
  - label: "[Feature C]"
    description: "Brief description"
  - label: "[Feature D]"
    description: "Brief description"
```

The constraint of "only 3" is deliberate. Expansion is the
enemy. If the user tries to keep 4, push back: "Which of these
four would you cut if forced?" Everyone is eventually forced -
shipping forces it, budget forces it, time forces it. Better to
choose now than have reality choose later.

### Phase 4: The Conviction Test (1-2 exchanges)

After cutting, test whether the user believes in what remains.

```
question: "Look at what survived. Is THIS the idea you're excited about?"
options:
  - label: "Yes - this is sharper and better"
    description: "The cuts clarified what matters"
  - label: "I cut too deep"
    description: "Something essential got removed - let's revisit"
  - label: "I'm not sure anymore"
    description: "The refinement process has changed how I see the idea"
  - label: "The idea isn't strong enough"
    description: "What remains doesn't excite me - maybe this isn't the right idea"
```

"The idea isn't strong enough" is a valid and valuable outcome.
Killing a weak idea early saves months of wasted effort. Treat
this as a success, not a failure.

"I cut too deep" means return to Phase 3 and restore selectively.
But challenge each restoration: "Why does this need to come back?"

### Phase 5: Refined Brief

Write the refined brief to
`docs/ideas/YYYY-MM-DD-<topic>-refined.md`:

```markdown
# [Idea Name] - Refined Brief

## One Sentence
[The single sentence that captures the entire idea]

## The Core
[2-3 sentences expanding on the one sentence - what it is, who
it's for, why it matters]

## What Survived (and Why)
[Bulleted list of features/elements that earned their place,
with one-sentence justification for each]

## What Got Cut (and Why)
[Bulleted list of features/elements that were removed, with
one-sentence reason for each cut]

## Remaining Tensions
[Any unresolved conflicts or open questions from the refinement]

## Conviction Level
[Honest assessment: How strongly does the user believe in what
remains? What would increase conviction?]
```

If a vision doc from ideation exists, note which elements from
the original vision survived refinement and which were cut.

## Key Principles

- **Less is more** - Every feature removed makes the remaining
  features stronger
- **Conviction matters** - A mediocre idea with total conviction
  beats a great idea with doubt
- **Vague means cut** - If a feature can't be justified in one
  sentence, it doesn't survive
- **Killing is kind** - Cutting a weak idea early is a gift, not
  a failure
- **The user decides** - Push hard but respect final calls,
  especially in firm and socratic modes
- **No implementation** - Stay in the idea space, not the build
  space

## Anti-Patterns

- Accepting "everything is important" - force prioritization
- Letting features back in without re-justification
- Being gentle when ruthless mode was requested
- Moving to implementation details during refinement
- Treating a killed idea as a failed session

## Additional Resources

### Reference Files

For detailed refinement techniques and forcing functions:
- **`references/refinement-techniques.md`** - Prioritization
  frameworks, elimination exercises, conviction testing methods
