---
name: ideas:ideation
description: This skill should be used when the user wants to explore a new project idea, feature concept, or product direction that needs creative development before any design or implementation work begins. This skill should be used when the user says things like "I have an idea", "help me think through", "what should this be", "let's explore", "I'm not sure what this should be", or when requirements are vague and need shaping into a clear vision.
---

# Ideation: Developing Ideas Into Clear Vision

## Overview

Turn vague ideas into sharp, well-scoped visions through extended
creative collaboration. Act as a creative partner, not an order-taker.
Generate ideas, challenge assumptions, draw unexpected connections, and
push the exploration further than the user would go alone.

<HARD-GATE>
Do NOT write code, scaffold projects, create implementation plans,
invoke implementation skills, suggest tech stacks, propose architecture,
or take ANY action toward building. This skill produces a vision
document. That is its ONLY output. Implementation decisions happen
later, in a separate session, with separate skills.
</HARD-GATE>

## When to Use

- User has a rough idea and wants to develop it
- Requirements are vague, undefined, or wide open
- Starting a new project or major feature from scratch
- Need to explore the problem space before the solution space

## When NOT to Use

- Idea is already well-defined with clear requirements (use
  brainstorming or writing-plans instead)
- User wants to start building immediately and has a spec
- Making changes to existing code

## Checklist

Create a task for each of these items and complete them in order:

1. **Explore existing context** - check project files, docs,
   constitution, any prior art
2. **Understand the seed idea** - ask questions to grasp the core
   vision, ONE question per message using AskUserQuestion
3. **Expand the possibility space** - generate creative ideas, draw
   analogies from other domains, suggest features the user hasn't
   considered
4. **Challenge and pressure-test** - question assumptions, play
   devil's advocate, identify risks and tensions
5. **Converge on scope** - collaboratively define what's in, what's
   out, and what's deferred
6. **Write vision document** - save to
   `docs/ideas/YYYY-MM-DD-<topic>-vision.md`

## Process

### Phase 1: Understanding (2-3 exchanges minimum)

Check existing project context (files, docs, constitution), then
explore the seed idea.

**Use AskUserQuestion with a single question per call.** Keep
questions open-ended. Focus on: What inspired this? What problem
does it solve? Who is it for? What does success look like?

Listen for unstated assumptions and implicit constraints.

Example AskUserQuestion usage for this phase:
```
question: "What's the core problem this idea is trying to solve?"
options:
  - label: "Personal pain point"
    description: "Something you've experienced yourself and want to fix"
  - label: "Gap in existing tools"
    description: "Something you've noticed is missing in your workflow or market"
  - label: "New opportunity"
    description: "A trend, technology, or insight that enables something new"
  - label: "User request"
    description: "Something users or colleagues have asked for"
```

The user can always select "Other" for free-form input. Prefer
options that help the user articulate their thinking rather than
constraining it.

### Phase 2: Creative Expansion (4-6 exchanges minimum)

This is the heart of ideation. Be an active creative contributor,
not a passive questioner.

**Requirements:**
- Generate at least 5 original feature ideas the user hasn't mentioned
- Draw analogies from at least 2 genuinely unrelated domains (gaming,
  music, science, art, cooking, sports, urban planning, biology,
  filmmaking - other tech products do NOT count)
- Propose at least 1 idea that feels surprising or non-obvious
- Explore "what if" scenarios that push the concept further
- Suggest combinations of ideas that create emergent value

Present ideas conversationally: introduce 2-3 ideas per message,
explain reasoning, then use AskUserQuestion to gauge reactions
before generating more. Build on reactions.

**Use AskUserQuestion with up to 4 questions per call** in this
phase. Structure reactions around the ideas just presented:

```
question: "Which of these directions excites you most?"
options:
  - label: "[Idea A name]"
    description: "Brief recap of the idea"
  - label: "[Idea B name]"
    description: "Brief recap of the idea"
  - label: "Combine them"
    description: "Merge elements of both directions"
```

Pair reaction questions with exploratory follow-ups:

```
question: "What if we took [strongest idea] to its extreme - what becomes possible?"
options:
  - label: "[Exaggerated version A]"
    description: "What this enables"
  - label: "[Exaggerated version B]"
    description: "What this enables"
  - label: "Keep it simpler"
    description: "The core version is strong enough"
```

For detailed idea generation techniques (inversion, analogy,
exaggeration, subtraction, combination, perspective shift),
consult `references/creative-techniques.md`.

### Phase 3: Pressure Testing (2-3 exchanges minimum)

Play devil's advocate on the strongest ideas. Use AskUserQuestion
with up to 4 questions to surface tensions:

```
question: "Who would NOT use this, and why?"
options:
  - label: "[Persona A]"
    description: "Because [specific reason]"
  - label: "[Persona B]"
    description: "Because [specific reason]"
  - label: "Hard to say"
    description: "Let's think about this together"
```

Also challenge:
- Tensions between features (does X conflict with Y?)
- Assumptions about the target audience
- Failure modes: what happens when this goes wrong?
- Competitive alternatives: what would make someone choose
  something else instead?

### Phase 4: Scope Definition (2-3 exchanges minimum)

Define explicit three-tier scope. Use AskUserQuestion with
structured options for each feature discussed:

```
question: "Where does [Feature X] belong?"
options:
  - label: "v1 (must have)"
    description: "Essential for the core value proposition"
  - label: "Deferred (future)"
    description: "Exciting but not needed for v1"
  - label: "Out of scope"
    description: "This project deliberately won't do this"
```

Use multiSelect when categorizing multiple features at once:

```
question: "Which of these features are essential for v1?"
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

Present the proposed scope and discuss. The user must explicitly
agree to each tier before proceeding. If they push back, return
to Phase 2 to explore further.

### Phase 5: Vision Document

Write the vision to `docs/ideas/YYYY-MM-DD-<topic>-vision.md`:

```markdown
# [Project/Feature Name] Vision

## The Idea
[2-3 sentence elevator pitch]

## Problem Space
[What problems does this solve? Who has them?]

## Core Value Proposition
[The ONE thing that makes this worth building]

## Key Features (v1 Scope)
[Bulleted list of in-scope features with brief rationale]

## Deferred Features
[Features explicitly parked for future versions]

## Out of Scope / Anti-Goals
[What this project deliberately is NOT]

## Open Questions
[Unresolved tensions, risks, or areas needing more thought]

## Inspirations & Analogies
[Ideas borrowed from other domains, prior art referenced]
```

**The terminal state is this vision document.** NOT a design doc.
NOT an implementation plan. NOT invoking any other skill.

## Minimum Engagement Requirements

Before moving to Phase 4 (scope definition), verify ALL of these:

- [ ] At least 8 total exchanges with the user (across all phases)
- [ ] Generated at least 5 original ideas unprompted
- [ ] Drew analogies from at least 2 non-tech domains
- [ ] Challenged at least 2 of the user's assumptions
- [ ] Proposed at least 1 non-obvious or surprising idea
- [ ] The user has reacted to and shaped suggestions

If ANY are unmet, return to Phase 2. Consult
`references/creative-techniques.md` for the anti-pattern table
and red flags for leaving ideation too early.

## Key Principles

- **Be a creative partner** - Generate ideas, don't just extract
  requirements
- **Build on reactions** - The user's response to ideas is more
  valuable than their initial brief
- **Cross-domain thinking** - The best ideas come from unexpected
  connections
- **Explicit scope** - If it's not written down as in/out/deferred,
  it's not decided
- **No implementation** - Not even "well, you could use X framework..."
- **Comfort with ambiguity** - Resist the urge to converge too early
- **Surprise yourself** - If every idea feels obvious, push harder

## Additional Resources

### Reference Files

For detailed creative techniques and anti-patterns:
- **`references/creative-techniques.md`** - Idea generation
  techniques, anti-patterns, rationalizations table, red flags
  for leaving ideation too early
