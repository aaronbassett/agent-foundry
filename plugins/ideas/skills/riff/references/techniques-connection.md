# Connection Techniques

*"We need outside material — bring something in."*

These techniques introduce external input. The creative energy comes
from collision with something outside the current conversation. A
parallel domain, another idea from the session, a stolen mechanism, a
random concept. Unlike reframing (which changes the lens) or mutation
(which changes the idea), connection brings new material to the table
and forces it into contact with what's already there. The spark is in
the collision.

### Analogy

Draw parallels from genuinely unrelated domains — biology, music, urban
planning, cooking, sports, architecture, ecology. The key word is
"genuinely." Another tech product is not a cross-domain analogy; it's a
competitive comparison. Analogy works because every domain has solved
its own version of fundamental problems: coordination, growth,
resilience, communication, resource allocation. Borrowing a frame from
a distant domain reveals structural similarities that are invisible
when you stay in tech-land.

This includes concept hopping — stepping through multiple domains in a
chain, where each hop reveals a different facet. It also includes
opposite domain mapping — deliberately choosing a domain that seems
maximally irrelevant and forcing yourself to find the parallel. The
further the domain, the more surprising the insight.

**Good examples:**

- **Riffing on a deployment pipeline tool.** The conversation is stuck
  in DevOps jargon. Analogy from restaurant kitchens: "How does a
  kitchen brigade handle the dinner rush? Every station works in
  parallel, the expeditor coordinates timing so all plates for a table
  land together, and mise en place means nothing starts until
  everything is prepped." New threads: pre-deployment readiness checks
  as mise en place, a coordination layer that ensures dependent
  services deploy in sync like plates hitting the pass, rollback as
  "86ing" a dish that's not right.

- **Riffing on a team health monitoring tool.** Analogy from ecology:
  "How does a forest signal that it's sick? Not one dramatic event —
  slow indicators. Canopy thinning, soil composition shifting, certain
  species disappearing." New threads: leading indicators vs. lagging
  indicators, the idea of "sentinel species" (which team behaviors
  vanish first when things go wrong?), health as an ecosystem rather
  than a single metric.

- **Riffing on an API rate limiting system.** Analogy from traffic
  engineering: "How do cities handle congestion? Not by blocking cars
  at the city limits — by metering on-ramps, creating HOV lanes for
  high-priority traffic, and using roundabouts instead of hard stops."
  New threads: tiered rate limits as HOV lanes, gradual throttling
  instead of hard cutoffs, priority queuing for authenticated vs.
  anonymous callers.

- **Riffing on a notification system.** Concept hop through domains:
  Start with beekeeping — "bees do a waggle dance to signal where the
  food is, not to say 'pay attention.'" Hop to architecture — "how a
  building uses light and sightlines to direct you without signs." New
  threads: notifications that encode information in their form rather
  than their content, ambient environmental cues instead of explicit
  alerts, designing for "I already know before I check."

- **Riffing on a user onboarding flow.** Opposite domain mapping —
  pick something far: jazz improvisation. "A jazz musician joining a
  new ensemble doesn't read a manual. They listen for a few bars,
  pick up the key and tempo, then start contributing small phrases
  before taking a solo." New threads: onboarding as listening first,
  letting new users observe before acting, graduating from small
  contributions to full agency, the "key and tempo" of a product
  (what's the rhythm experienced users are already in?).

**Anti-examples:**

- Don't: "It's like Slack but for X" or "It's the Uber of Y." That's
  not analogy — it's a tech pitch formula. The whole point is to leave
  the tech domain. Draw from biology, cooking, urban planning, music
  — not from other startups.

- Don't: Name a domain and stop there. "It's like a garden." OK — what
  about a garden? What specific structural feature of gardens maps to
  the idea? Analogy requires working the parallel, not just naming it.

- Don't: Force a single analogy to carry everything. If the restaurant
  kitchen maps well to deployment orchestration but doesn't map to
  monitoring, let it go. Analogies illuminate one angle, not the whole
  product.

**When to deploy:** The idea is trapped in its own domain. Everyone is
referencing the same tech patterns, the same competitors, the same
conventions. The conversation needs a window into a completely different
world where similar problems have been solved differently.

**See also:** Mechanic transfer (below) for stealing a specific
mechanism rather than drawing a general parallel. Metaphor mutation
(techniques-reframing.md) for evolving an analogy through successive
steps.

---

### Combination

Take two or more ideas that have already surfaced in this session —
threads that seem unrelated — and smash them together. What emerges
from the collision? Combination works because riff sessions generate
many threads that run in parallel without ever touching. Each thread is
interesting on its own, but the intersections between threads are where
the most original ideas live. Nobody plans a combination — it happens
when you notice two things on the table and wonder what their child
would look like.

This also includes grafting: taking a feature or mechanic you've seen
in an external product and splicing it onto the current idea. Not
copying the product — transplanting one specific element into a
completely different context.

**Good examples:**

- **Riffing on a developer learning platform.** Thread A has been
  exploring "error-first documentation" — learning by seeing what goes
  wrong. Thread B has been exploring "peer mentorship matching."
  Combine: a platform where learners who've just solved a specific
  error get matched with learners currently hitting that same error.
  The mentor's qualification isn't seniority — it's recency. They
  struggled with this exact thing yesterday.

- **Riffing on a community events app.** Thread A explored "ambient
  social signals" — letting people broadcast availability without
  committing to an event. Thread B explored "skill-sharing as an event
  type." Combine: a mode where you broadcast what you could teach
  right now ("I'm free and could show someone how to sharpen kitchen
  knives") and others within range can claim the session. Teaching as a
  spontaneous ambient activity, not a scheduled class.

- **Riffing on a project management tool.** Thread A explored
  "capacity-aware task pools" where nobody is assigned to tasks.
  Thread B explored "mood check-ins" from the standup discussion.
  Combine: task pools that factor in mood. Not surveillance —
  opt-in signals like "I'm in a focus groove" or "low-energy day,
  give me routine work." The pool adapts to human state, not just
  availability.

- **Riffing on an internal knowledge base.** The riff has been
  exploring "auto-generated docs from code commits" and separately
  "common mistakes as the organizing principle." Graft from Wikipedia:
  take the "talk page" mechanic — every auto-generated doc page gets a
  parallel discussion thread where people argue about whether the
  generated content is accurate. The knowledge base grows through
  disagreement, not just accumulation.

**Anti-examples:**

- Don't: Combine things that are already related. "What if we combined
  the search feature with the filter feature?" That's integration, not
  combination. The technique is about connecting threads that seem
  unrelated — the friction between them is where the insight lives.

- Don't: Combine by stapling. "It does A AND B" isn't combination —
  it's a feature list. The combination should produce something
  emergent that neither idea contains on its own. If you can describe
  the result as "A plus B," you haven't combined deeply enough.

- Don't: Force every thread to combine. Some ideas are better left
  separate. If smashing two threads together produces something
  contrived, drop it. Combination works when the collision sparks
  something — if it doesn't spark, move on.

**When to deploy:** The session has generated multiple interesting but
separate threads. The conversation is hopping between topics without
cross-pollinating. Someone says "going back to the earlier point
about..." — that's the signal. What if that earlier point didn't just
get revisited but got married to the current one?

**See also:** Signal amplification (techniques-mutation.md) for
making one thread the center, then combining. "Yes, and..."
(techniques-flow.md) for building on a single thread rather than
merging two.

---

### Mechanic transfer

Steal a specific, concrete mechanism from another domain and drop it
directly into the idea. Not a general parallel (that's analogy) — a
specific operational pattern. "Use matchmaking like competitive online
games." "Use triage like an emergency room." "Use blind auditions like
an orchestra." The mechanism is precise enough to implement: it has
rules, a process, a structure. You're not saying "it's like a game" —
you're saying "use Elo rating to rank contributors."

Mechanic transfer is more actionable than analogy. An analogy says
"think about how forests work." A mechanic transfer says "use
mycorrhizal networks — the specific mechanism where trees share
nutrients through underground fungal connections — and apply that
structure to how teams share context." One illuminates; the other
provides a blueprint.

**Good examples:**

- **Riffing on a code review assignment system.** Steal the draft pick
  mechanic from fantasy sports: reviewers "draft" the PRs they want to
  review based on interest and expertise. Each round, the person with
  the lightest review load picks first. Nobody gets assigned reviews
  they don't want. The queue self-balances because heavy reviewers
  pick later. Specific mechanism: rotating pick order based on inverse
  current load.

- **Riffing on a feature request prioritization tool.** Steal the
  triage mechanic from emergency medicine: every incoming request gets
  a 30-second triage — not to solve it, but to categorize it. Red:
  blocking users now, treat immediately. Yellow: painful but people
  have workarounds, schedule soon. Green: nice-to-have, queue it.
  Black: won't fix, close with explanation. Specific mechanism:
  rapid categorization into four severity tiers with defined response
  times.

- **Riffing on a developer documentation system.** Steal the spaced
  repetition mechanic from flashcard apps like Anki: docs that haven't
  been visited in a while surface themselves for review. The interval
  grows if the content is confirmed accurate, shrinks if it gets
  flagged as stale. Frequently-decaying docs (API references for
  fast-moving services) surface more often. Specific mechanism:
  exponential backoff schedule tied to content freshness signals.

- **Riffing on a team retrospective tool.** Steal the blind audition
  mechanic from orchestra hiring: all retrospective feedback is
  submitted anonymously and read aloud without attribution before
  discussion. The team reacts to the idea, not the person. Only after
  discussion does anyone claim authorship (if they want to). Specific
  mechanism: anonymized submission, collective evaluation, then
  optional reveal.

- **Riffing on an incident response platform.** Steal the relay race
  handoff mechanic: when an on-call engineer's shift ends mid-incident,
  there's a structured 3-minute handoff protocol — current state,
  hypotheses tried, next steps recommended — before the baton passes.
  Not a chat log dump. A ritualized, timed transfer of context.
  Specific mechanism: structured handoff template with mandatory
  fields and a countdown timer.

**Anti-examples:**

- Don't: Transfer a vibe instead of a mechanism. "Let's make it feel
  like a game" is analogy territory. Mechanic transfer needs a
  specific operational pattern: Elo rating, draft picks, blind
  auditions, triage categories. If you can't describe the mechanism's
  rules in two sentences, it's too vague.

- Don't: Transfer a mechanism that's already common in tech. "Use A/B
  testing" or "use kanban" — those are already native to the domain.
  The value is in stealing from outside: emergency medicine, sports
  leagues, orchestras, auction houses, restaurant kitchens.

- Don't: Transfer the mechanism without adapting it. A blind audition
  works for orchestras because musical skill is audible. Directly
  copying it without thinking about what "blind" means in a code
  review context produces a gimmick, not an insight. Translate the
  mechanism, don't just paste it.

**When to deploy:** Analogies have been productive but too abstract.
Someone says "that's a nice metaphor but what would we actually build?"
Mechanic transfer is the concrete answer. It takes the analogy's
insight and turns it into a specific operational pattern with rules
and structure.

**See also:** Analogy (above) for general domain parallels.
Constraint game (techniques-mutation.md) for using borrowed
constraints rather than borrowed mechanisms.

---

### Random stimulus insertion

Introduce an arbitrary, unselected concept and force the conversation
to find relevance. "What does this idea have to do with a vending
machine?" "How does a lighthouse connect to your authentication
system?" "What would a scarecrow suggest about this problem?" The
randomness is the entire point. You cannot pre-select a comfortable
analogy or a convenient domain — the concept is imposed, and the
creative work is in making the connection.

Random stimulus insertion works because human brains are connection
machines. Given any two concepts, we will find a link — and that
forced link often bypasses the well-worn paths that deliberate thinking
follows. The technique produces lateral jumps that no amount of
careful analysis would reach. It's uncomfortable, it feels silly, and
it works precisely because it circumvents the filters that keep
ideation "sensible."

**Good examples:**

- **Riffing on a CI/CD monitoring dashboard.** Random stimulus:
  "aquarium." Force it: an aquarium is a contained ecosystem where
  health is visible at a glance — fish behavior tells you the water
  quality before instruments do. What if the dashboard displayed
  system health through behavioral indicators rather than metrics?
  Not "CPU at 78%" but "deploys are moving sluggishly" or "the test
  suite is thrashing." New threads: behavioral metaphors for system
  state, animation speed as a health signal, the dashboard as a
  living thing you read by feel.

- **Riffing on a team standup tool.** Random stimulus: "postcard."
  Force it: a postcard is brief, personal, sent from wherever you are,
  and the constraint of the format IS the feature. What if standups
  were literally postcard-sized? A fixed-dimension card with room for
  one image and three sentences. You send it from your context —
  your desk, your commute, your couch. New threads: physical
  constraints as communication design, visual standups, the intimacy
  of a personal dispatch vs. a status report.

- **Riffing on a permissions system for a SaaS product.** Random
  stimulus: "beehive." Force it: in a beehive, roles aren't assigned
  — they emerge based on age and need. Young bees clean cells, older
  ones guard the entrance, the oldest forage. Permissions that evolve
  based on tenure and demonstrated behavior rather than being
  statically assigned by an admin. New threads: earned permissions,
  role graduation, permissions that decay if unused (the forager who
  stops foraging loses forager status).

- **Riffing on an internal developer portal.** Random stimulus:
  "pinball machine." Force it: a pinball machine rewards momentum —
  the faster you play, the more paths open up. What if the developer
  portal rewarded exploration momentum? The more services you discover
  and interact with, the more advanced capabilities and hidden
  documentation unlock. Sitting idle resets you to the basics. New
  threads: exploration streaks, progressive disclosure tied to
  engagement, the portal as something you play rather than browse.

**Anti-examples:**

- Don't: Pick a "random" concept that conveniently relates to the
  topic. If you're riffing on a music streaming app and your random
  stimulus is "concert," that's not random — that's a planted
  connection. The discomfort of a truly unrelated concept is what
  makes the technique work. Use an actual random word generator, pick
  a noun from a random page, or ask someone else to supply the word.

- Don't: Give up after ten seconds. "What does a scarecrow have to do
  with authentication? Nothing. Moving on." The point is to force it.
  Sit with the discomfort. A scarecrow is a fake presence that deters
  by appearance alone — that's actually an interesting frame for
  security theater vs. real authentication. The connection is always
  there if you push through the awkwardness.

- Don't: Use random stimulus as a party trick and then discard the
  result. The forced connection needs to be explored with the same
  rigor as any other technique. If the aquarium insight produces a
  thread about behavioral health indicators, follow that thread. The
  random stimulus is the spark, not the destination.

**When to deploy:** The conversation has been sensible for too long.
Every idea logically follows from the last. The riff is productive but
predictable. Random stimulus insertion is a hard lateral jolt — use it
when thinking needs to be derailed from its current track because that
track, however reasonable, has stopped producing surprises.
