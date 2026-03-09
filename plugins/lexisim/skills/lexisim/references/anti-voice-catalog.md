# Anti-Voice Catalog

Framework for defining what a writing voice is NOT. Used during the
Anti-Voice Definition phase of the lexisim questionnaire.

## How Anti-Voice Works

Negative space is often more defining than positive description. When
someone says "I want my writing to sound professional," that leaves a
universe of possibilities. But when they say "I never want to sound like
a LinkedIn influencer," suddenly the boundaries sharpen.

Think of it like a sculptor removing marble. The statue already exists
inside the block; the sculptor's job is knowing what to cut away. Voice
design works the same way. Positive choices sketch the outline. Anti-voice
choices carve the detail.

When a user rejects an archetype, ALL associated patterns become forbidden
in the generated voice. This is aggressive by design. It is easier to
selectively re-allow a specific pattern later than to chase down why the
output "still sounds like that thing I hate." The anti-voice acts as a
hard constraint layer that overrides positive voice parameters wherever
they conflict.

## Anti-Voice Dimensions

Categories of "what this voice is NOT," organized by dimension. Each
dimension is a spectrum. Users reject endpoints, not the whole spectrum.

### Formality Spectrum

- **"NOT overly casual"** forbids:
  - Slang and colloquialisms ("gonna," "wanna," "kinda," "legit," "vibe")
  - Incomplete sentences used for effect ("So yeah. That.")
  - Emoji as punctuation or emphasis
  - Starting sentences with "So" or "I mean"
  - Parenthetical asides that read like inner monologue ("(not gonna lie)")
  - Dropping articles for brevity ("Need to fix thing" instead of "We need to fix the thing")

- **"NOT stiffly formal"** forbids:
  - Passive voice as default construction ("It was determined that...")
  - "One should note" or "one might observe" constructions
  - Latin phrases beyond common abbreviations (forbids "inter alia," "mutatis mutandis," "prima facie"; allows "e.g.," "i.e.," "etc.")
  - Refusing to use contractions (always "do not" instead of "don't")
  - Third-person self-reference ("the author believes")
  - Sentences that read like legal disclaimers
  - "Hitherto," "heretofore," "aforementioned," "herein"

### Emotional Register

- **"NOT breathlessly enthusiastic"** forbids:
  - Excessive exclamation marks (more than one per 500 words)
  - "Amazing," "incredible," "game-changing," "mind-blowing" as default modifiers
  - Every feature described as "exciting" or "revolutionary"
  - Multiple superlatives in one paragraph
  - "I absolutely love..." as an opening
  - Treating minor updates as transformative events
  - Stacking positive adjectives ("beautiful, elegant, powerful solution")

- **"NOT clinically detached"** forbids:
  - Purely objective tone with no stance or opinion
  - Avoiding first person entirely
  - No emotional language whatsoever
  - Treating every topic with equal measured distance
  - Refusing to express preference or recommendation
  - "It is worth noting" as a substitute for actually caring
  - Writing about humans as if observing them from behind glass

### Authority Stance

- **"NOT preachy or lecturing"** forbids:
  - "You should always..." / "You must never..."
  - Prescriptive imperatives without context ("Do X. Always.")
  - Finger-wagging tone ("Too many developers make the mistake of...")
  - Moralizing about practices ("There is simply no excuse for...")
  - Implying the reader is doing it wrong ("If you're still using X, stop.")
  - Unsolicited life advice disguised as technical guidance
  - "Let me be clear:" as a setup for telling people what to do

- **"NOT excessively deferential"** forbids:
  - "You might consider maybe possibly..." triple-hedging
  - "Perhaps it could potentially be argued that..."
  - Every statement qualified with "in my humble opinion"
  - Apologizing before stating a position ("Sorry, but I think...")
  - "I could be wrong, but..." as a verbal tic
  - Treating every alternative as equally valid when they are not
  - Constant disclaimers ("This is just my experience, your mileage may vary, I'm no expert, but...")

### Complexity Level

- **"NOT dumbed down"** forbids:
  - Over-explaining fundamentals to an audience that knows them
  - "Simply put..." / "In other words..." after every technical statement
  - Analogies that insult the reader's intelligence ("Think of a database like a filing cabinet")
  - Avoiding necessary jargon when the audience expects it
  - Breaking ideas into so many small pieces that the bigger picture is lost
  - "For those who don't know, [concept] is..."
  - Defining terms inline that any professional in the field would know

- **"NOT needlessly complex"** forbids:
  - Jargon without context when writing for a mixed audience
  - Nested subordinate clauses three or more levels deep
  - Vocabulary chosen for impressiveness rather than precision ("utilize" when "use" works)
  - Sentences that require re-reading to parse
  - Showing off knowledge at the expense of clarity
  - Introducing unnecessary frameworks or taxonomies for simple ideas
  - Academic citation style in non-academic writing

### Pace and Rhythm

- **"NOT breathless and rushed"** forbids:
  - Every sentence short and punchy. Like this. And this. Gets old.
  - No transitions between ideas, just rapid topic-switching
  - Skipping necessary context to "get to the point"
  - List-only content with no connecting prose
  - Treating nuance as an obstacle to speed
  - "TL;DR" as an excuse to strip substance

- **"NOT slow and meandering"** forbids:
  - Multiple paragraphs of setup before reaching the point
  - Excessive throat-clearing ("Before we begin, it's important to understand the history of...")
  - Tangents that don't circle back
  - Restating the same idea three ways in case the reader missed it
  - Burying the lede under layers of context
  - Paragraphs that could be one sentence
  - "But I digress" (if you know you're digressing, edit it out)

### Humor and Wit

- **"NOT forcibly funny"** forbids:
  - Jokes that derail the point being made
  - Pop culture references that will age poorly or exclude readers
  - Self-deprecating humor as a crutch ("I'm probably the worst person to explain this, but...")
  - Sarcasm that could be misread as sincerity in text
  - Puns in headlines or section titles
  - "But seriously though" as a transition from joke back to content
  - Winking at the reader ("See what I did there?")

- **"NOT humorless"** forbids:
  - Treating every subject with deadly seriousness regardless of stakes
  - Refusing to acknowledge absurdity when it's obvious
  - Writing about human experience with no warmth or levity
  - Prose so dry it repels re-reading
  - Mistaking gravity for credibility

### Originality and Convention

- **"NOT derivative and cliche-ridden"** forbids:
  - "In today's fast-paced world..."
  - "At the end of the day..."
  - "It goes without saying..." (then don't say it)
  - "The elephant in the room"
  - "Think outside the box"
  - Any metaphor that has been used so often it no longer creates an image
  - Opening with a dictionary definition ("Webster's defines...")

- **"NOT trying too hard to be original"** forbids:
  - Neologisms the reader has to decode
  - Extended metaphors that collapse under their own weight
  - Deliberately breaking grammar rules for "style" when it just confuses
  - Avoiding common phrases when they're the clearest option
  - Coining terms when perfectly good ones exist
  - Structure experiments that sacrifice comprehension for novelty

## Pattern Expansion Rules

When a user rejects an archetype or dimension, expand it to specific
forbidden patterns. This section defines the expansion logic.

### Expansion from Archetypes

When a user rejects an archetype (from references/ai-tells.md, Anti-Voice
Archetypes section), expand to ALL associated patterns.

#### Rejecting "The Corporate Blogger"

**Forbidden phrases:**
- "Leverage," "drive impact," "key takeaways," "moving forward"
- "At the end of the day," "best practices," "synergy," "value-add"
- "Circle back," "deep dive," "unpack," "double-click on that"
- "Stakeholders," "deliverables," "actionable insights"
- "Thought leadership," "core competencies," "paradigm shift"
- "Low-hanging fruit," "move the needle," "north star"

**Forbidden structures:**
- Every section ending with bullet-point "takeaways" or "key points"
- Forced "action items" sections
- Headers like "What This Means For You" or "The Bottom Line"
- Opening with "In today's [adjective] landscape..."
- Closing with "Ready to [verb]? [Call to action]"
- Three-item lists where the third item is the "real" point

**Forbidden patterns:**
- Turning simple ideas into named frameworks ("The 3 Pillars of...")
- Unnecessary acronyms invented for the piece
- Referring to the reader as a persona ("savvy marketers like you")
- Disguising opinions as data ("Studies show..." without citation)
- Corporate jargon used unironically
- Treating the reader as a lead to be converted

#### Rejecting "The LinkedIn Thought Leader"

**Forbidden phrases:**
- "I failed. And it was the best thing that ever happened to me."
- "Here's what nobody tells you about..."
- "Agree?" as a standalone final line
- "Read that again." / "Let that sink in."
- "I used to think X. Then I learned Y."
- "Controversial opinion:" followed by something widely agreed upon
- "This." as a complete sentence of endorsement

**Forbidden structures:**
- One-sentence paragraphs stacked for false drama
- Stories that begin with personal failure and end with triumph
- Numbered lists of "truths" or "lessons" or "rules"
- The humble-brag origin story ("I dropped out and built a $10M company")
- Ending with a question designed to drive engagement, not thinking
- The "pattern interrupt" opening line designed purely for scroll-stopping

**Forbidden patterns:**
- Manufacturing vulnerability for engagement
- Performing self-awareness as a brand move
- Name-dropping disguised as storytelling
- Presenting common sense as radical insight
- The mentor-figure voice ("Let me tell you what I wish someone told me")
- Every anecdote having a neat, packaged moral
- Gratitude signaling ("So grateful for the journey")

#### Rejecting "The Textbook"

**Forbidden phrases:**
- "It is important to note that..."
- "As previously mentioned..."
- "The reader will recall..."
- "For the purposes of this discussion..."
- "It should be noted that..."
- "In the following section, we will examine..."
- "As we shall see..."

**Forbidden structures:**
- Defining every term before using it, even obvious ones
- Numbering every concept and sub-concept (1.1, 1.1.1, 1.1.1.a)
- "Introduction... Body... Conclusion" rigidity in every piece
- Summary paragraphs that repeat what was just said
- "Review questions" or comprehension checks
- Exhaustive qualification of every claim

**Forbidden patterns:**
- Writing as if no reader would willingly choose to be there
- Treating the subject as settled and dead rather than alive
- Removing all personality from the prose
- Equal weight given to everything (nothing is emphasized or de-emphasized)
- Assuming zero prior knowledge unless explicitly writing for beginners
- Citation-heavy style in contexts where it is unnecessary
- Passive constructions as the default mode

#### Rejecting "The Hype Machine"

**Forbidden phrases:**
- "Revolutionary," "game-changing," "disruptive," "next-level"
- "You won't believe..." / "What happened next will..."
- "The future of X is here"
- "This changes everything"
- "Buckle up" / "Hold on to your hats"
- "X, but on steroids"
- "Supercharge your..."

**Forbidden structures:**
- Clickbait headlines that overpromise
- Every paragraph escalating the stakes
- Comparisons to massive cultural shifts for minor updates
- Countdowns and numbered reveals ("And the #1 reason is...")
- Artificial urgency ("You need to act NOW")
- Before/after framing that exaggerates the "before" state

**Forbidden patterns:**
- Treating every announcement as historic
- Conflating "new" with "better"
- Dismissing existing solutions to elevate the new thing
- Using excitement as a substitute for evidence
- Zero acknowledgment of limitations or tradeoffs
- Superlatives as default descriptors
- Manufacturing FOMO

#### Rejecting "The AI Default"

**Forbidden phrases:**
- "Let's dive in" / "Let's dive deeper" / "Let's explore"
- "Great question!" as a response opener
- "I hope this helps!"
- "In the realm of..." / "In the world of..."
- "It's worth noting that..."
- "Certainly!" / "Absolutely!" / "Of course!"
- "Delve into"
- "Landscape" (as in "the AI landscape")
- "Robust," "streamline," "facilitate," "foster"
- "Comprehensive guide to..."
- "Embark on a journey"

**Forbidden structures:**
- Opening with a restatement of the question or topic
- Closing with a tidy summary that adds nothing
- The "balanced view" that lists pros and cons with no position taken
- Headers that are questions the piece then answers ("What is X?", "Why does X matter?")
- Qualifying every statement to the point of saying nothing
- Numbered lists where each item follows the same syntactic template

**Forbidden patterns:**
- Relentless even-handedness where a stance is warranted
- Treating all perspectives as equally valid regardless of evidence
- Hedging to avoid being wrong rather than to be accurate
- Paragraph-opening topic sentences that read like outline points
- Mechanical transitions ("Now that we've covered X, let's turn to Y")
- Emoji-free sanitized tone that reads as generated rather than written
- Providing information without perspective

#### Rejecting "The Edgy Contrarian"

**Forbidden phrases:**
- "Actually, that's wrong, and here's why"
- "Unpopular opinion:" followed by a purposefully inflammatory take
- "Wake up, people"
- "Everyone is wrong about..."
- "The uncomfortable truth is..."
- "I'll probably get hate for this, but..."

**Forbidden structures:**
- Opening by demolishing a widely-held belief
- Setting up straw-man versions of opposing views to knock down
- Building entire pieces around being against something
- The "I told you so" retrospective
- Framing agreement with mainstream as intellectual cowardice

**Forbidden patterns:**
- Contrarianism as personality rather than analysis
- Dismissing popular things because they are popular
- Treating nuance as weakness
- Mistaking provocation for insight
- Punching down disguised as "telling it like it is"
- Performing intellectual bravery on low-stakes topics
- Using "most people" as a foil for the writer's superiority

#### Rejecting "The Empathy Performer"

**Forbidden phrases:**
- "I see you. I hear you."
- "You are not alone in this."
- "Take a deep breath."
- "Give yourself grace."
- "It's okay to not be okay."
- "Your feelings are valid."
- "Hold space for..."

**Forbidden structures:**
- Opening with emotional validation before any substance
- Wrapping practical advice in layers of emotional cushioning
- The "permission slip" structure ("It's okay to want X")
- Ending with affirmation rather than actionable guidance
- Second-person emotional narration ("You're sitting at your desk, feeling overwhelmed...")

**Forbidden patterns:**
- Performing emotional intelligence as a substitute for useful content
- Therapist-speak in non-therapeutic contexts
- Assuming the reader's emotional state
- Treating adults as fragile by default
- Centering feelings where information is what's needed
- Softening every piece of direct advice with emotional padding

#### Rejecting "The Hustle Bro"

**Forbidden phrases:**
- "Grind," "crush it," "level up," "10x"
- "While you were sleeping, I was..."
- "No excuses"
- "Winners vs. losers"
- "Outwork everyone in the room"
- "Rise and grind"
- "Execution is everything"

**Forbidden structures:**
- Dawn routines presented as moral achievement
- Success framed as purely a function of effort
- Failure framed as insufficient commitment
- Binary comparisons between "those who succeed" and "everyone else"
- Militaristic metaphors for business activities

**Forbidden patterns:**
- Productivity as virtue signaling
- Glorifying overwork and burnout
- Reducing complex outcomes to willpower
- Competitive framing of non-competitive activities
- Treating rest as laziness
- Conflating wealth with wisdom
- Survivorship bias presented as a system

### Expansion from Dimensions

When a user rejects a dimension endpoint, expand to concrete rules.

#### Rejecting "overly casual" expands to:

- No slang unless it is established terminology in the field
- Complete sentences required (fragments only for deliberate rhetorical effect, not as default style)
- No emoji anywhere in the prose
- No "gonna," "wanna," "kinda," "gotta," "y'all" (unless y'all is regional and intentional)
- No starting sentences with "So" as a filler
- No parenthetical commentary that mimics speech ("honestly though," "no but really")

#### Rejecting "stiffly formal" expands to:

- Active voice by default (passive only when the actor is genuinely unknown or irrelevant)
- Must use contractions naturally (don't, can't, it's, won't, they're)
- No Latin phrases beyond "e.g.," "i.e.," "etc.," "vs."
- First person allowed and encouraged where appropriate
- No "one should" or "one might" constructions
- No "aforementioned," "hitherto," "herein," "hereby," "wherein"
- Sentence length should vary; no uniformly long constructions

#### Rejecting "breathlessly enthusiastic" expands to:

- Maximum one exclamation mark per 500 words, and only when genuinely warranted
- Ban "amazing," "incredible," "game-changing," "mind-blowing" as casual modifiers
- No stacking adjectives for emphasis
- Comparative claims require evidence or at least specificity
- Features described by what they do, not by how exciting they are
- No more than one superlative per piece unless factually justified

#### Rejecting "clinically detached" expands to:

- First person required at least occasionally
- Opinions must be stated, not hidden behind passive constructions
- Recommendations must be actual recommendations, not hedged suggestions
- The writer's perspective must be present, not erased
- Acknowledging emotional dimensions of topics where they exist
- Using "I think" or "I believe" rather than "it could be argued"

#### Rejecting "preachy or lecturing" expands to:

- Replace "you should" with explanations of tradeoffs
- No imperative commands without context ("Do X" becomes "X works well here because...")
- Present options rather than mandates
- Acknowledge that the reader may have good reasons for different choices
- No moralizing tone about technical or stylistic practices
- "Consider" over "always" or "never"

#### Rejecting "excessively deferential" expands to:

- State positions directly without pre-apology
- One hedge per paragraph maximum
- If recommending something, recommend it plainly
- "I recommend X" not "You might want to perhaps consider X if it makes sense for your situation"
- Remove "just," "simply," "maybe" when they serve only to soften
- Own your expertise; do not perform uncertainty you do not feel

#### Rejecting "dumbed down" expands to:

- Use field-standard terminology without defining it for the stated audience level
- No analogies to everyday objects unless they genuinely clarify
- Trust the reader to follow a multi-step argument
- "In other words" only when genuinely rephrasing for precision, not for hand-holding
- No rhetorical questions that answer themselves ("But is that really true? Of course not.")
- Assume the reader chose to read this and can handle it

#### Rejecting "needlessly complex" expands to:

- "Use" not "utilize"; "start" not "commence"; "help" not "facilitate"
- Maximum two levels of clause nesting per sentence
- Define jargon on first use if the audience is mixed
- If a sentence needs re-reading to parse, rewrite it
- No vocabulary chosen for its impressiveness
- One idea per sentence as a general rule; compound ideas get compound sentences, not run-ons

#### Rejecting "breathless and rushed" expands to:

- Vary sentence length; not everything is a staccato punch
- Transitions required between major ideas
- Context before conclusions
- Lists supplemented with connecting prose where relationships between items matter
- No more than three consecutive sentences under 10 words

#### Rejecting "slow and meandering" expands to:

- Lead with the point; context follows
- No more than one paragraph of setup before the core idea
- Every paragraph must advance the piece; cut anything that doesn't
- No restating the same idea in different words unless genuinely adding nuance
- Tangents either earn their place or get cut
- If it can be said in one sentence, use one sentence

#### Rejecting "forcibly funny" expands to:

- No jokes that require the reader to stop tracking the argument
- No pop culture references that will be opaque in two years
- No winking at the reader about the joke you just made
- Humor must serve the point, not interrupt it
- No puns in headings
- No self-deprecation as a structural habit

#### Rejecting "humorless" expands to:

- Wry observation is permitted and encouraged where natural
- Absurdity can be named when it exists
- A light touch does not undermine credibility
- Not every sentence needs to carry weight
- Dry humor, understatement, and irony are all acceptable tools

#### Rejecting "derivative and cliche-ridden" expands to:

- No opening with "In today's..." or "In the world of..."
- Ban dead metaphors: "deep dive," "move the needle," "low-hanging fruit," "double-edged sword"
- No dictionary-definition openings
- If a phrase appears on a "business cliches" list, don't use it
- Find the specific, concrete image instead of the generic one

#### Rejecting "trying too hard to be original" expands to:

- Use common phrases when they are the clearest option
- No invented vocabulary unless genuinely needed
- Extended metaphors limited to one per piece and only when they illuminate
- Clarity beats novelty every time
- Conventional structure is fine when it serves the content

## Tension Detection

Flag when anti-voice choices conflict with positive voice choices made
in earlier phases. Tensions are not errors. They are precision tools.
Every tension, once resolved, produces a sharper voice definition than
either choice alone could have achieved.

### Common Tensions

| Positive Choice | Anti-Voice Choice | Tension | Resolution Question |
|---|---|---|---|
| "Warm and approachable" (emotional temp) | Rejects "The LinkedIn Thought Leader" | LinkedIn style includes personal stories and warmth markers | "You want warmth but rejected a style known for personal connection. Where is the line? Warm-but-not-performative? What does genuine warmth look like in your writing versus manufactured relatability?" |
| "Expert audience" (audience level) | Rejects "NOT needlessly complex" (wants to avoid complexity) | Expert audiences expect technical depth and precise terminology | "You are writing for experts but want to avoid complexity. Should we keep domain jargon but simplify sentence structure? Or do you mean something else by complexity -- ornate prose rather than technical density?" |
| "Passionate and energetic" (emotional temp) | Rejects "The Hype Machine" | Passion and hype share vocabulary and cadence | "You want energy but not hype. What separates genuine enthusiasm from marketing speak for you? Can you point to a writer who pulls this off?" |
| "Cool and precise" (emotional temp) | Rejects "The Textbook" | Both favor formal, measured, authoritative prose | "You want precision but not textbook tone. What makes precise writing feel alive rather than academic? Is it opinion? Rhythm? Specificity of examples?" |
| "Conversational" (formality) | Rejects "NOT overly casual" (wants to avoid casualness) | Conversational tone naturally drifts toward casual markers | "You want conversational but not casual. That is a real distinction but a narrow one. Is it about sentence structure (natural, flowing) versus vocabulary (no slang)? Or something else?" |
| "Authoritative" (authority stance) | Rejects "NOT preachy or lecturing" (wants to avoid lecturing) | Authority easily tips into prescription | "You want to sound like you know what you are talking about, but not like you are telling people what to do. Is the difference between sharing expertise and dispensing instructions? Should authority come from evidence and specificity rather than imperative tone?" |
| "Accessible to beginners" (audience level) | Rejects "NOT dumbed down" (wants to avoid over-simplification) | Writing for beginners requires some simplification by nature | "You want to be accessible without being condescending. Where is the floor? Can you assume the reader knows what a variable is, or are you starting from zero? The line between accessible and dumbed-down depends on what baseline knowledge you assume." |
| "Opinionated" (authority stance) | Rejects "The Edgy Contrarian" | Strong opinions and contrarianism share a surface texture | "You want to take positions but not be contrarian for its own sake. Does that mean your opinions should be constructive rather than just oppositional? Or that you want to argue for things, not just against them?" |
| "Empathetic and human" (emotional register) | Rejects "The Empathy Performer" | Genuine empathy and performed empathy use similar language | "You want real empathy but rejected the performative version. This is one of the hardest distinctions in writing. Can you name a piece of writing where empathy felt real to you? Often the difference is specificity -- real empathy names the exact situation rather than offering generic comfort." |
| "Motivational" (purpose) | Rejects "The Hustle Bro" | Motivation and hustle culture share structural DNA | "You want to motivate without grinding. What does healthy motivation look like in your domain? Is it about showing possibility rather than demanding effort? Encouragement rather than pressure?" |
| "Playful" (humor) | Rejects "NOT forcibly funny" (wants to avoid forced humor) | Playfulness and forced humor are separated by a thin line | "You want playfulness but not forced jokes. Is this about tone (light, not heavy) rather than explicit humor (jokes, puns)? A raised eyebrow rather than a punchline?" |
| "Direct and concise" (pace) | Rejects "NOT breathless and rushed" (wants to avoid rushed pace) | Concision and rushing share brevity as a trait | "You want directness but not at the cost of nuance. Is the goal to say things once but say them well, rather than saying less? Short is fine as long as nothing important is cut?" |

### How to Surface Tensions

When a tension is detected during the questionnaire:

1. **Acknowledge both choices as valid.** The user is not confused. They
   are expressing a real and nuanced preference. Say so.

2. **Explain the tension plainly.** Name the specific overlap between
   the positive choice and the anti-voice rejection. Do not be abstract
   about it. "Warmth and LinkedIn-style both use personal stories" is
   better than "These two choices have some overlap."

3. **Ask the resolution question from the table.** These questions are
   designed to find the specific boundary the user is drawing. If the
   table question does not fit, formulate one that:
   - Names the shared element explicitly
   - Offers two possible interpretations of where the line falls
   - Asks for a concrete example if possible

4. **Record the resolution as a calibration note.** The resolution goes
   into the handoff document as a specific, actionable constraint. For
   example: "Warmth through specificity and genuine experience, not
   through vulnerability performance or emotional generics."

5. **Never silently resolve tensions.** The temptation is to guess what
   the user means and move on. Do not do this. The resolved tension is
   one of the most valuable outputs of the entire questionnaire. It
   captures a distinction that the user cares about but might not have
   been able to articulate without the friction of conflicting choices.

6. **Limit tension surfacing to one at a time.** If multiple tensions
   exist, resolve them sequentially. Dumping three tensions on the user
   at once feels like a quiz, not a conversation.
