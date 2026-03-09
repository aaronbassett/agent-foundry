# Lexisim Question Bank

Complete question text, options, and analysis notes for every question in the lexisim questionnaire. This is the "script" for the entire guided conversation — the core SKILL.md references this file for exact question text and options during each phase.

---

## Phase 1: Entry Path & Setup

### Q1: Entry Path

**Type**: AskUserQuestion

**Question**: "How would you like to build your writing style?"

**multiSelect**: false

**Options**:

1. **"Design from scratch"**
   - Description: "I'll describe the voice I want through a series of guided questions"

2. **"Emulate a reference"**
   - Description: "I have writing samples I'd like to use as a starting point"

**Analysis note**: This determines the entire questionnaire flow. "Design from scratch" skips Phase 2 (Reference Analysis) and includes Phase 7 (Implicit Influence Probe). "Emulate a reference" includes Phase 2 and skips Phase 7. Both paths converge at Phase 3 (Audience Persona). Record this choice — it affects which questions are asked and how the final voice profile is weighted between aspirational design choices and empirical reference patterns.

---

### Q2: Profile Name

**Type**: Free text

**Prompt**: "What name should this writing style have?"

**Analysis note**: This is a label only — it does not affect voice calibration. Use the name as the identifier throughout the session and in the generated skill file. If the user gives a generic name like "my style," accept it without pushback. The name will be used as the skill filename and display name in the generated output.

---

### Q3: Scope Selection

**Type**: AskUserQuestion

**Question**: "Where should the generated skill and writing assistant be created?"

**multiSelect**: false

**Options**:

1. **"Project scope"**
   - Description: "Install in .claude/ within the current project — available only in this repository"

2. **"User scope"**
   - Description: "Install in ~/.claude/ — available across all your projects"

**Analysis note**: This determines the output path for the generated skill files. Project scope writes to `.claude/skills/` in the current working directory. User scope writes to `~/.claude/skills/`. Record this for file generation at the end of the process. If the user is unsure, suggest project scope as the safer default since it can be moved later.

---

## Phase 2: Reference Analysis (Emulate path only)

_Skip this phase entirely if the user chose "Design from scratch" in Q1._

### Q4: Reference Samples

**Type**: Free text

**Prompt**: "Paste 1-3 excerpts of writing you want to emulate. These can be from different sources — blog posts, documentation, articles, newsletters, whatever captures the voice you're after. Longer excerpts (3+ paragraphs each) give better results."

**Analysis note**: This is the most information-dense input in the entire questionnaire. Perform deep stylometric analysis on each sample:
- Sentence length distribution (mean, stdev, min, max)
- Vocabulary register (formal/informal/technical/conversational)
- Punctuation fingerprint (em-dash frequency, parenthetical rate, semicolon usage, exclamation density)
- Paragraph structure (length, topic sentence patterns, transition patterns)
- First-person frequency and personal voice level
- Contraction rate
- Opening and closing patterns
- Metaphor and analogy density
- Jargon-to-plain-language ratio

Store these metrics as the empirical baseline. All subsequent preference questions in the Emulate path should be cross-referenced against this analysis. When user preferences conflict with what the reference samples actually do, flag the tension and ask the user which should win.

---

### Q5: What You Like

**Type**: Free text

**Prompt**: "What specifically do you like about this writing? What makes it work for you — is it the tone, the pacing, the way it explains things, the personality? Be as specific as you can."

**Analysis note**: This reveals which dimensions of the reference the user is actually drawn to versus which are incidental. A user might paste a Paul Graham essay but only care about the conversational tone, not the philosophical tangents. Use this to weight the stylometric analysis from Q4 — amplify the dimensions the user explicitly calls out and treat uncalled dimensions as secondary. If the user's description contradicts what the samples actually do (e.g., "I love how concise it is" about a notoriously verbose writer), note this as an aspirational signal rather than a perceptual error.

---

### Q6: Influence Blending

**Type**: AskUserQuestion

**Question**: "Do you want to blend elements from multiple influences?"

**multiSelect**: false

**Options**:

1. **"Just this one reference"**
   - Description: "Use these samples as the primary model for the voice"

2. **"Add more influences"**
   - Description: "I want to mix in elements from other writing too"

**Analysis note**: If the user selects "Add more influences," loop back to Q4 and Q5 for the additional reference(s). Cap at 3 total reference sets to avoid dilution. When blending multiple influences, ask the user to rank which dimensions they want from each source (e.g., "pacing from Source A, vocabulary from Source B"). Without explicit dimension mapping, blended voices tend toward averaging — which produces something bland rather than distinctive.

---

## Phase 3: Audience Persona

### Q7: Audience Type

**Type**: AskUserQuestion

**Question**: "Who is the primary reader for writing in this voice?"

**multiSelect**: false

**Options**:

1. **"Technical practitioners"**
   - Description: "Engineers, developers, designers — people who build things and want implementation detail"

2. **"Technical leadership"**
   - Description: "Engineering managers, architects, CTOs — people who make technical decisions but may not write code daily"

3. **"Non-technical stakeholders"**
   - Description: "Product managers, executives, clients — people who need to understand outcomes without implementation detail"

4. **"General public"**
   - Description: "No assumed technical background — the writing should be accessible to anyone"

**Analysis note**: Audience type is the single strongest constraint on vocabulary density, assumed context, and scaffolding level. Cross-reference with Q8 (Knowledge Level) — a "technical practitioner" audience at "beginner" level is very different from one at "expert" level. This combination determines the floor and ceiling for jargon, the amount of context-setting needed, and whether examples should be code-heavy or conceptual.

---

### Q8: Knowledge Level

**Type**: AskUserQuestion

**Question**: "What's their familiarity with the subject matter you'll be writing about?"

**multiSelect**: false

**Options**:

1. **"Expert"**
   - Description: "They know the domain deeply — skip the basics, get to the nuance"

2. **"Intermediate"**
   - Description: "They have working knowledge but appreciate context on advanced topics"

3. **"Beginner"**
   - Description: "They're learning — define terms, explain motivation, build from foundations"

4. **"Mixed"**
   - Description: "The audience spans multiple levels — the writing needs to work for all of them"

**Analysis note**: "Mixed" is the hardest constraint to satisfy and requires specific techniques: progressive disclosure, layered explanations (simple statement followed by technical elaboration), and optional-depth markers. If the user selects "Mixed," the generated voice profile should include guidance on how to handle multi-level audiences — not just a single register. Cross-reference with Q7: a "mixed" audience of "technical practitioners" still has a higher baseline than a "mixed" audience of "general public."

---

### Q9: Reader Frustrations

**Type**: Free text

**Prompt**: "What frustrates your readers about existing writing in this space? What do they complain about — too jargon-heavy, too dumbed down, too long, too vague, too corporate? If you're not sure, describe what frustrates YOU when reading in this domain."

**Analysis note**: This is a negative-space question — it reveals what the voice should avoid by identifying existing pain points. Frustrations often map directly to anti-patterns: "too jargon-heavy" means calibrate vocabulary down, "too vague" means increase specificity and examples, "too long" means tighten information density. Store these as hard constraints that override other calibration signals. If a user says their readers hate corporate language, then even if other answers trend formal, the voice must avoid corporate register. Cross-reference with Q25 (Anti-Voice Archetypes) and Q26 (AI Pattern Rejection) for a complete avoidance profile.

---

### Q10: Reader Time Budget

**Type**: AskUserQuestion

**Question**: "How will your readers typically engage with this writing?"

**multiSelect**: false

**Options**:

1. **"Scanning quickly"**
   - Description: "They skim for key points — headings, bold text, and first sentences matter most"

2. **"Focused reading"**
   - Description: "They'll read the whole thing but won't re-read — clarity on first pass is essential"

3. **"Deep engagement"**
   - Description: "They'll sit with the writing, re-read sections, and think about it — density is welcome"

**Analysis note**: Time budget directly controls information density, scaffolding level, and structural formatting. "Scanning quickly" demands front-loaded paragraphs, heavy use of structural signposts (headings, lists, bold key terms), and ruthless editing. "Focused reading" allows flowing prose but still requires clear topic sentences. "Deep engagement" permits complex syntax, nested ideas, and rewards re-reading. Cross-reference with Phase 4 (Reading Level Calibration) — a "scanning" reader with "complex syntax" preferences creates a tension that needs resolution.

---

## Phase 4: Reading Level Calibration

### Q11–Q18: Reading Level Pairs

**Type**: AskUserQuestion (repeated 8 times)

**Instructions**: Read the 8 example pairs from `references/reading-level-calibration.md`. Present each pair to the user using AskUserQuestion. For each pair, show both Version A and Version B, then ask:

**Question template**: "Which feels closer to what you're aiming for?"

**multiSelect**: false

**Options** (same for all 8 pairs):

1. **"Closer to Version A"**
   - Description: (Varies by pair — see calibration file for which dimension Version A represents)

2. **"Closer to Version B"**
   - Description: (Varies by pair — see calibration file for which dimension Version B represents)

3. **"Somewhere between"**
   - Description: "Neither extreme — aim for a middle ground"

**The 8 pairs and what they calibrate**:

| Question | Calibration File Pair | Dimension Calibrated |
|----------|----------------------|---------------------|
| Q11 | Pair 1: Caching strategy | Vocabulary complexity |
| Q12 | Pair 2: API rate limiter | Vocabulary complexity |
| Q13 | Pair 3: Feature flag deployment | Syntactic complexity |
| Q14 | Pair 4: Database index | Syntactic complexity |
| Q15 | Pair 5: Microservices latency | Conceptual density |
| Q16 | Pair 6: Load balancer | Conceptual density |
| Q17 | Pair 7: Environment variables | Scaffolding level |
| Q18 | Pair 8: Pull request workflow | Scaffolding level |

**Analysis note**: Each dimension is tested twice to improve reliability. Average the two responses per dimension:
- Both "Version A" = strong preference for the simpler end
- Both "Version B" = strong preference for the complex end
- Split or "Somewhere between" = moderate/middle preference

Build a 4-axis reading level profile:
- **Vocabulary**: simple ←→ technical
- **Syntax**: short/direct ←→ nested/complex
- **Density**: few ideas per passage ←→ many ideas per passage
- **Scaffolding**: high (explains why) ←→ low (just the facts)

Cross-reference with Q7 (Audience Type) and Q8 (Knowledge Level). Flag contradictions — e.g., if the user selected "beginner" audience but consistently prefers Version B (complex) across all pairs, surface this tension and ask which should take priority.

For the **Emulate path**: also compare these preferences against the empirical analysis of reference samples from Q4. If the reference samples sit at a different reading level than the user's stated preferences, this indicates the user wants to adjust the reference rather than replicate it exactly.

---

## Phase 5: Voice Character

### Q19: Emotional Temperature

**Type**: AskUserQuestion

**Question**: "What emotional register should this voice operate in?"

**multiSelect**: false

**Options**:

1. **"Cool and precise"**
   - Description: "Measured, controlled, deliberate. Think Stripe documentation, RFC-style prose, or a well-edited technical paper. The writing respects the reader's time and intelligence without trying to be their friend."

2. **"Warm and approachable"**
   - Description: "Friendly without being casual, helpful without being condescending. Think a senior colleague explaining something over coffee. The writing puts the reader at ease."

3. **"Neutral and balanced"**
   - Description: "Neither warm nor cold — the subject speaks for itself. Think quality journalism or well-written reference material. The voice doesn't draw attention to itself."

4. **"Passionate and energetic"**
   - Description: "Opinionated, enthusiastic, alive. Think a great conference talk or a blog post by someone who genuinely cares. The writing has momentum and conviction."

**Analysis note**: Emotional temperature affects word choice, intensifier frequency, exclamation usage, and hedging patterns. "Cool and precise" should minimize intensifiers, avoid exclamations, and prefer understatement. "Warm and approachable" uses moderate intensifiers, contractions, and occasional direct address. "Neutral and balanced" avoids both enthusiasm markers and coolness markers. "Passionate and energetic" allows strong intensifiers, rhetorical questions, and emphatic phrasing. Cross-reference with Q24 (Personal Voice Level) — "cool and precise" combined with "heavily personal" creates an interesting voice (think Joan Didion), while "passionate" with "minimal self-reference" creates authority-driven enthusiasm.

---

### Q20: Pacing & Information Flow

**Type**: AskUserQuestion

**Question**: "How should information unfold in this voice?"

**multiSelect**: false

**Options**:

1. **"Inverted pyramid"**
   - Description: "Lead with the conclusion, then support it. The most important information comes first. If the reader stops at any point, they've already gotten the key takeaway."

2. **"Narrative build"**
   - Description: "Set up context, develop the argument, arrive at the insight. The payoff comes at the end. Reward readers who stay with you."

3. **"Tutorial rhythm"**
   - Description: "Step-by-step progression. Each section builds on the last. Clear signposts mark where you are and what's coming next."

4. **"Conversational meander"**
   - Description: "Follow the thought where it goes. Tangents are features, not bugs. The journey matters as much as the destination."

**Analysis note**: Pacing interacts heavily with Q10 (Reader Time Budget). "Scanning quickly" + "narrative build" is a conflict — scanners need inverted pyramid or tutorial rhythm. "Deep engagement" + "conversational meander" is a natural fit. Flag mismatches and ask the user to resolve. Pacing also affects paragraph structure: inverted pyramid uses front-loaded topic sentences, narrative build uses progressive revelation, tutorial rhythm uses numbered/sequential structure, and conversational meander uses associative transitions.

---

### Q21: Sentence Structure

**Type**: AskUserQuestion (show-don't-tell)

**Question**: "Read these three versions of the same idea. Which feels closest to what you want this voice to sound like?"

**multiSelect**: false

**Options**:

1. **"Short and direct"**
   - Description: "Tight sentences. One idea each. No wasted words."
   - Preview:
     ```
     Good documentation starts with knowing your reader. Figure out
     what they need. Then give them exactly that. Cut everything
     else. If a sentence doesn't serve the reader, delete it.
     White space is not wasted space. It's breathing room. Your
     reader will thank you for the things you chose not to say.
     ```

2. **"Flowing and connected"**
   - Description: "Ideas link together and sentences carry the reader forward."
   - Preview:
     ```
     Good documentation starts with knowing your reader, which
     means understanding not just what they need to learn but also
     what they already know and what they're trying to accomplish.
     Once you have that picture, the writing almost organizes
     itself, because every sentence exists to move the reader
     closer to their goal, and anything that doesn't serve that
     purpose — however well-crafted it might be — is a candidate
     for cutting.
     ```

3. **"Deliberately varied"**
   - Description: "Mix short and long. Use contrast to create rhythm and emphasis."
   - Preview:
     ```
     Good documentation starts with knowing your reader. Not their
     job title or their years of experience, but what they're
     actually trying to do right now and what's standing in their
     way. Figure that out and the structure reveals itself. Every
     sentence either moves the reader forward or it doesn't. The
     ones that don't? Cut them. It feels ruthless. It's not. It's
     respect — for your reader's time and for the craft itself.
     ```

**Analysis note**: This is the lexisim equivalent of Voiceprint Q6, but reframed for voice design rather than voice capture. Voiceprint asks "how do you naturally write?" — lexisim asks "what do you want the voice to sound like?" The distinction matters: users may choose a structure they admire but don't naturally produce. Cross-reference with Phase 4 reading level results (especially the Syntactic Complexity pairs Q13-Q14). If a user picks "short and direct" here but preferred Version B (complex syntax) in Phase 4, surface the tension. Also cross-reference with Q20 (Pacing) — "flowing and connected" pairs naturally with "narrative build," while "short and direct" pairs with "inverted pyramid."

---

### Q22: Transition Style

**Type**: AskUserQuestion

**Question**: "How should this voice move from one idea to the next?"

**multiSelect**: false

**Options**:

1. **"Casual connectors"**
   - Description: "So, anyway, the thing is, turns out, here's the deal... Transitions that sound like thinking out loud."

2. **"Formal connectors"**
   - Description: "However, additionally, that said, consequently... Transitions that signal logical structure explicitly."

3. **"Questions"**
   - Description: "But what does this mean in practice? So how do you actually do this? Transitions that pivot by asking."

4. **"Direct jumps"**
   - Description: "No bridge needed. End one point, start the next. The reader follows without being led."

**Analysis note**: Adapted from Voiceprint Q9. Voiceprint uses this to identify how someone already writes; lexisim uses it to define how the designed voice should write. Transition style is topic-independent and structurally distinctive — it's one of the most reliable markers for making a generated voice feel consistent. "Casual connectors" pair naturally with "warm and approachable" (Q19) and "conversational meander" (Q20). "Formal connectors" pair with "cool and precise" and "inverted pyramid." "Questions" work with any temperature but strongly imply "narrative build" or "tutorial rhythm" pacing. "Direct jumps" pair with "short and direct" sentence structure (Q21) and suggest confidence in the reader's ability to follow.

---

### Q23: Opening/Hook Style

**Type**: AskUserQuestion

**Question**: "How should this voice typically open a piece of writing?"

**multiSelect**: false

**Options**:

1. **"Direct statement"**
   - Description: "Jump straight in. 'Here's the problem with X.' No preamble, no throat-clearing."

2. **"Question"**
   - Description: "Open with a question that frames the piece. 'Why do most style guides fail?' Pull the reader in by making them curious."

3. **"Story or scenario"**
   - Description: "Start with a specific moment or situation. 'You're three hours into a refactor when you realize the tests don't cover what you thought they did.' Ground the reader in experience."

4. **"Observation"**
   - Description: "Name a pattern or phenomenon. 'Most teams write documentation the same way they write code — iteratively, reluctantly, and at the last minute.' Start from something the reader recognizes."

**Analysis note**: Adapted from Voiceprint Q13. Opening style is a structural fingerprint — it's one of the first things a reader notices and one of the strongest contributors to a voice feeling "like itself" across different pieces. Cross-reference with Q19 (Emotional Temperature): "direct statement" maps to "cool and precise" or "passionate," "question" works across all temperatures, "story/scenario" implies warmth or energy, "observation" suggests a reflective or analytical temperament. Also cross-reference with Q20 (Pacing): "direct statement" maps to "inverted pyramid," "story/scenario" maps to "narrative build."

---

### Q24: Personal Voice Level

**Type**: AskUserQuestion

**Question**: "How much personality and self-reference should show up in this voice?"

**multiSelect**: false

**Options**:

1. **"Heavily personal"**
   - Description: "Lots of 'I think,' 'in my experience,' personal anecdotes and opinions. The writer's perspective is the frame for everything."

2. **"Lightly personal"**
   - Description: "Some first-person and occasional personal references, but the focus stays on the subject. The writer is present but not the star."

3. **"Minimal self-reference"**
   - Description: "The subject speaks for itself. No 'I' statements, no personal anecdotes. Authority comes from the content, not the author."

**Analysis note**: Adapted from Voiceprint Q12. In Voiceprint, this describes an existing habit; in lexisim, it's a design decision. Personal voice level controls first-person pronoun frequency, anecdote inclusion, opinion markers ("I believe," "I've found"), and whether the writer positions themselves as a character in the piece or an invisible narrator. Cross-reference with Q19 (Emotional Temperature): "cool and precise" + "heavily personal" creates a distinctive, opinionated-but-controlled voice. "Warm and approachable" + "minimal self-reference" is possible but requires warmth to come from word choice and tone rather than personal presence. Flag unusual combinations as interesting rather than contradictory — they often produce the most distinctive voices.

---

## Phase 6: Anti-Voice Definition

### Q25: Anti-Voice Archetypes

**Type**: AskUserQuestion

**Question**: "Which of these writing 'characters' is this voice explicitly NOT? Select all that apply."

**multiSelect**: true

**Options**:

1. **"The Corporate Communicator"**
   - Description: "Leverages synergies, drives alignment, and circle-backs on action items. Everything is a 'solution' and every problem is an 'opportunity.' Writes in a way that says everything and means nothing."

2. **"The Breathless Enthusiast"**
   - Description: "Everything is AMAZING and GAME-CHANGING and you NEED to see this! Exclamation points everywhere! Can't contain excitement! Zero critical distance from any topic!"

3. **"The Academic Gatekeeper"**
   - Description: "Writes to demonstrate intelligence rather than communicate ideas. Unnecessarily complex vocabulary, passive voice, hedge upon hedge. Would never use one word when seven will do."

4. **"The Condescending Explainer"**
   - Description: "As you might already know... Simply put... It's actually quite straightforward... Manages to make the reader feel stupid while claiming to be helpful."

5. **"The Motivational Speaker"**
   - Description: "You've GOT this! Believe in yourself! Every setback is a setup for a comeback! Relentlessly positive, allergic to nuance, treats all problems as mindset issues."

6. **"The Edgelord Contrarian"**
   - Description: "Hot takes for the sake of hot takes. Everything mainstream is wrong. Deliberately provocative framing. More interested in being surprising than being right."

7. **"The AI Default"**
   - Description: "Certainly! Great question. Let me break this down for you. In today's rapidly evolving landscape... Helpful to a fault, structured to a fault, generic to a fault."

**Analysis note**: Anti-voice archetypes define the boundaries of the voice by negative space. Each selected archetype maps to specific patterns that the generated voice must actively avoid:
- **Corporate Communicator**: Ban buzzwords list, avoid nominalization, forbid "leverage/utilize/drive/align/synergy"
- **Breathless Enthusiast**: Cap exclamation marks (0-1 per piece), limit superlatives, require hedging on strong claims
- **Academic Gatekeeper**: Enforce plain-language alternatives, limit passive voice, cap average sentence length
- **Condescending Explainer**: Ban "simply," "just," "actually," "as you might know," "of course"
- **Motivational Speaker**: Ban hollow encouragement, require specificity on advice, avoid imperative-heavy structures
- **Edgelord Contrarian**: Require charitable framing of opposing views, ban "hot take" framing devices
- **AI Default**: Cross-reference with Q26 for specific pattern rejection

Cross-reference with Q9 (Reader Frustrations) — frustrations often map directly to anti-voice archetypes. If a user's frustrations align with archetypes they didn't select, surface this and ask if they want to add them.

---

### Q26: AI Pattern Rejection

**Type**: AskUserQuestion

**Question**: "Which of these common AI-generated patterns should this voice actively avoid? Select all that apply."

**multiSelect**: true

**Options**:

1. **"Hedging qualifiers"**
   - Description: "'It's worth noting that...', 'It bears mentioning...', 'What's interesting is...' — phrases that add distance without adding meaning"

2. **"Generic contextual openers"**
   - Description: "'In today's fast-paced world...', 'In the ever-evolving landscape of...', 'As technology continues to advance...' — throat-clearing that could open any article on any topic"

3. **"Overblown attribution"**
   - Description: "'This serves as a testament to...', 'This underscores the importance of...', 'This speaks volumes about...' — inflated significance markers"

4. **"Forced engagement phrases"**
   - Description: "'Let's dive in!', 'Let's unpack this', 'Buckle up!' — manufactured enthusiasm that tries to create energy the content should generate on its own"

5. **"Rule-of-three lists"**
   - Description: "Always grouping things in exactly three: 'faster, better, stronger' / 'plan, execute, iterate' — the AI default for any enumeration"

6. **"Formal stacking connectors"**
   - Description: "'Moreover...', 'Furthermore...', 'Additionally...' — connectors that feel more like a term paper than something a human would write"

7. **"Negative parallelism"**
   - Description: "'Not only X, but also Y', 'It's not about X, it's about Y', 'The question isn't X, it's Y' — reframe-then-pivot structures used so frequently they've become invisible clichés"

8. **"Summary recaps"**
   - Description: "'In conclusion...', 'To summarize...', 'In summary, we've explored...' — restating everything the reader just read as if they've already forgotten"

**Analysis note**: Adapted from Voiceprint Q14-Q15, combined into a single comprehensive question. Each selected pattern maps to a category of avoidance rules in the generated voice profile. When a pattern is selected, expand the rejection to the full category:
- **Hedging qualifiers** → also flag: "it should be noted," "it's important to remember," "one might argue"
- **Generic openers** → also flag: any temporal/contextual opener that could apply to any topic
- **Overblown attribution** → also flag: "a powerful reminder," "a clear indication," "a shining example"
- **Forced engagement** → also flag: "ready? let's go," "stay with me here," "here's where it gets interesting"
- **Rule-of-three** → flag when lists are artificially constrained to exactly 3 items; natural lists of 2, 4, or 5 are fine
- **Stacking connectors** → also flag: "in addition," "what's more," "equally important"
- **Negative parallelism** → also flag: "less about X, more about Y," "the real question is"
- **Summary recaps** → also flag: "as we've seen," "having established that," closing paragraphs that merely restate

Cross-reference with Q25 — if the user selected "The AI Default" archetype, consider pre-selecting all options here and asking the user to confirm or deselect any they're actually fine with.

---

### Q27: Emoji & Formatting

**Type**: AskUserQuestion

**Question**: "How should this voice handle emoji and expressive formatting?"

**multiSelect**: false

**Options**:

1. **"Use emoji naturally"**
   - Description: "Emoji are part of the voice — use them for emphasis, tone, or personality where they fit"

2. **"Rarely, if ever"**
   - Description: "Keep the writing clean of emoji — let words carry the tone"

3. **"Depends on context"**
   - Description: "Casual or social content can use emoji; formal or professional writing should not"

**Analysis note**: Same as Voiceprint Q16. Emoji usage is a strong stylistic marker that readers notice immediately. If "Use emoji naturally" is selected, the voice profile should include guidance on which emoji are on-brand (e.g., thoughtful/subtle vs. playful/expressive) and where they belong (inline emphasis vs. section headers vs. list bullets). If "Depends on context," the voice profile needs separate formatting rules for different content types. Cross-reference with Q19 (Emotional Temperature): "cool and precise" + "use emoji naturally" is unusual and should be flagged for confirmation. "Passionate and energetic" + "rarely, if ever" is viable but means energy must come entirely from word choice and punctuation.

---

## Phase 7: Implicit Influence Probe (Design path only)

_Skip this phase if the user chose "Emulate a reference" in Q1._

### Q28: Influence Probe

**Type**: Free text

**Prompt**: "Is there any writing you've encountered that feels close to what you're imagining — even roughly? It could be a specific author, a blog, documentation you admire, a newsletter, anything. If nothing comes to mind, that's fine too — just say so."

**Analysis note**: This is a soft probe for implicit influences that the user may not have recognized as design inputs. If the user names a specific source, use it as a cross-reference for the voice profile — look up the named source's known stylistic characteristics and check whether the user's Phase 3-6 answers are consistent with that influence. If they are, the influence confirms the design direction. If they diverge, the user may be imagining a modified version of the influence — note which dimensions they're keeping and which they're changing.

If the user says "nothing comes to mind," that's a valid answer — it means the voice is being designed from pure preference rather than reference. Do not push for an answer.

This question comes late in the questionnaire deliberately. By Phase 7, the user has already made concrete choices about audience, reading level, voice character, and anti-patterns. Naming an influence at this point serves as a consistency check, not a starting point.

---

## Phase 8: Uncanny Valley Detection

_This phase is not a traditional question — it's a generative test-and-refine loop._

### Process

**Step 1: Generate test paragraphs**

Using all collected data from Phases 1-7, generate 2-3 short paragraphs (3-5 sentences each) that demonstrate the designed voice applied to a realistic topic. Choose a topic relevant to the user's stated audience (Q7) and domain context.

Each paragraph should exercise different aspects of the voice:
- Paragraph 1: Explanatory/teaching content (tests vocabulary, scaffolding, information density)
- Paragraph 2: Opinionated/persuasive content (tests emotional temperature, personal voice, conviction level)
- Paragraph 3: Transitional/connecting content (tests pacing, transitions, sentence structure)

**Step 2: Present to the user**

Show all paragraphs and ask as free text:

**Prompt**: "Here's a sample of what this voice sounds like in practice. Read it and tell me: what feels right, what feels off, and what's missing? Be specific — 'the tone in paragraph 2 is too aggressive' is more useful than 'it's not quite right.'"

**Step 3: Collect and categorize feedback**

Parse the user's feedback into adjustment categories:
- **Tone adjustments**: Emotional temperature is too hot/cold, too formal/casual
- **Structural adjustments**: Sentences too long/short, pacing too fast/slow, too much/little scaffolding
- **Vocabulary adjustments**: Too technical/simple, wrong register, specific words that feel off
- **Pattern violations**: Specific phrases or structures that trigger the uncanny valley
- **Missing elements**: Things the user expected to see that aren't present

**Step 4: Iterate if needed**

If the feedback is substantial (more than minor tweaks), regenerate the test paragraphs incorporating the adjustments and present again. Cap at 3 iterations — if the voice isn't landing after 3 rounds, the calibration data from earlier phases may have internal conflicts that need to be surfaced and resolved explicitly.

**Step 5: Confirm and proceed**

When the user is satisfied (or close enough), confirm the voice profile and proceed to skill generation.

**Final prompt**: "Are you happy with this voice, or do you want to adjust anything before I generate the skill file?"

**Analysis note**: The Uncanny Valley Detection phase exists because preference questionnaires alone cannot fully specify a voice. Humans recognize "wrongness" in voice faster than they can articulate what "rightness" looks like. By generating samples and collecting reactions, this phase captures the gap between stated preferences and felt experience. The feedback from this phase should be treated as the highest-priority calibration signal — it overrides earlier questionnaire answers when they conflict, because it represents the user's reaction to the actual output rather than their prediction of what they'd want.

---

## Cross-Reference Matrix

After collecting all responses, build a voice profile that tracks consistency across these dimensions:

| Dimension | Inputs | Potential Conflicts |
|-----------|--------|-------------------|
| Vocabulary level | Q4 (samples), Q11-Q12 (calibration), Q7-Q8 (audience) | Samples vs. stated preference; audience needs vs. preference |
| Sentence structure | Q4 (samples), Q13-Q14 (calibration), Q21 (preference) | Calibration pairs vs. explicit choice |
| Information density | Q4 (samples), Q15-Q16 (calibration), Q10 (time budget) | Dense preference + scanning reader |
| Scaffolding | Q4 (samples), Q17-Q18 (calibration), Q8 (knowledge level) | Low scaffolding + beginner audience |
| Emotional temperature | Q19 (stated), Q24 (personal voice) | Cool + heavily personal (unusual but valid) |
| Pacing | Q20 (stated), Q10 (time budget), Q21 (structure) | Meander + scanning; build + short sentences |
| Transitions | Q22 (stated), Q19 (temperature), Q20 (pacing) | Casual connectors + cool temperature |
| Openings | Q23 (stated), Q19 (temperature), Q20 (pacing) | Story opener + inverted pyramid pacing |
| Anti-patterns | Q9 (frustrations), Q25 (archetypes), Q26 (AI rejection) | Frustrations that map to unselected archetypes |
| Formatting | Q27 (emoji), Q10 (time budget) | Emoji + scanning (emoji can aid scanning) |

**Conflict resolution principle**: When inputs disagree, prioritize in this order:
1. Phase 8 feedback (user reacting to actual output)
2. Phase 4 reading level calibration (show-don't-tell is more reliable than stated preference)
3. Phase 3 audience constraints (audience needs override personal preference)
4. Phase 5-6 stated preferences (explicit design choices)
5. Phase 2 reference analysis (empirical baseline, if available)

The exception is anti-patterns (Phase 6): these are hard constraints that override everything. If the user says "never do X," the voice never does X, regardless of what other signals suggest.
