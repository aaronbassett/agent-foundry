# Ideas Plugin

Explore, develop, and refine ideas through creative collaboration — from open-ended riffing to structured ideation to ruthless refinement — before any design or implementation work begins.

## Features

- **Creative partnership** - Generates original ideas, draws cross-domain analogies, and challenges assumptions rather than passively extracting requirements
- **Structured exploration** - Guides through understanding, expansion, pressure-testing, and scoping phases
- **Adaptive refinement** - Three intensity modes (ruthless, firm, socratic) that match the user's needs
- **Technique-driven divergence** - 22-technique toolkit for sustained creative exploration without convergence pressure
- **Interactive decision-making** - Uses AskUserQuestion for structured choices throughout every process
- **Written deliverables** - Produces vision docs, refined briefs, and branching outlines in `docs/ideas/`

## Skills

### ideation

Develops rough ideas into comprehensive vision documents through 5 phases:

1. **Understanding** - Explore the seed idea with focused questions
2. **Creative Expansion** - Generate ideas, draw analogies, explore possibilities
3. **Pressure Testing** - Challenge assumptions, identify risks and tensions
4. **Scope Definition** - Define what's in, out, and deferred
5. **Vision Document** - Write the final vision to `docs/ideas/`

**Trigger phrases**: "I have an idea", "help me think through", "what should this be", "let's explore", "I'm not sure what this should be"

### refine

Strips ideas down to their irreducible core through systematic elimination and conviction testing:

1. **Intake** - Understand the current idea from docs or conversation
2. **One-Sentence Test** - Force the idea into a single sentence
3. **Chopping Block** - Challenge every feature and element
4. **Conviction Test** - Verify the user believes in what remains
5. **Refined Brief** - Write the distilled brief to `docs/ideas/`

Three adaptive modes: **ruthless** (argue against everything), **firm** (challenge but respect conviction), **socratic** (guide through questions).

**Trigger phrases**: "refine this idea", "what's the core of this", "help me cut this down", "challenge this idea", "is this idea any good", "strip this back"

### riff

Sustained divergent exploration that stays in creative space without converging on a single direction. Unlike ideation (which funnels toward a vision document) or refine (which strips to essentials), riff deliberately maintains multiple threads and follows unexpected connections.

Uses a 22-technique toolkit organized in 4 groups:

- **Reframing** - Shift perspective to see the idea from new angles
- **Mutation** - Transform and evolve elements in unexpected ways
- **Connection** - Bridge across domains and find surprising links
- **Flow** - Maintain creative momentum and deepen exploration

The session adapts dynamically, selecting techniques based on creative energy and where the exploration leads. The deliverable is a branching outline capturing all threads and possibilities, written to `docs/ideas/`.

**Trigger phrases**: "let's riff on this", "let's jam on", "what if we just explored", "let's go wild with", "riff on this idea", "free-associate around"

## Installation

```bash
claude plugin install ideas@agent-foundry
```

## License

MIT
