# Riff: Async Code Review That Respects Deep Work

**Date:** 2026-03-25
**Seed:** "Code review is broken — it interrupts the reviewer's flow and
the author waits forever. What if we rethought the whole thing?"

## Branches

### Time-Shifted Review
- Reviews happen in the reviewer's natural gaps, not on the author's
  schedule
  - Calendar-aware queuing — PRs surface during low-focus blocks, never
    during deep work windows
  - "Review mood" self-reporting — reviewer flags when they're in the
    right headspace for careful reading vs. quick rubber-stamps
  - Batch mode — queue up reviews and do them all in a dedicated
    30-minute block, like processing email
- Author-side: estimated review arrival based on reviewer patterns
  - "Your reviewer typically reviews between 2-4pm — expect feedback
    by 4:30"
  - Eliminates the refresh-the-PR-page anxiety loop

### Review Decay
- Reviews that age without action get quieter, not louder
  - Inverse notification model: the PR notification fades over 48 hours
    instead of escalating
  - After decay threshold, the PR enters a "stale review pool" visible
    to anyone on the team — soft redistribution without blame
  - If nobody picks it up, the system suggests: "This PR has been
    waiting 4 days. Split it into smaller PRs?"
- The decay mechanic surfaces a real signal: if nobody is motivated to
  review it, the PR might be too large, too unclear, or solving a
  problem nobody cares about
  - Decay-as-feedback — the lack of review IS information for the author

### Reviewable Units (Not PRs)
- The PR is the wrong atomic unit for review — it's defined by the
  author's work session, not the reviewer's comprehension
  - What if the tool broke PRs into "reviewable units" — logically
    coherent chunks that each take 5-10 minutes to understand?
  - Author annotates boundaries: "review this migration separately from
    the API changes"
  - System suggests splits based on file clustering and dependency
    analysis
- Stacked reviews: units reviewed in dependency order, each building on
  the last
  - Reviewer builds understanding incrementally instead of trying to
    hold the whole PR in their head
  - Partial approval: "these three units are good, this one needs work"
    — author can merge the approved parts
- The 200-line rule inverted: instead of "keep PRs under 200 lines,"
  the tool ensures every reviewable unit is under 200 lines regardless
  of total PR size

### Review as Conversation
- Shift from "approve/request changes" binary to threaded dialogue
  - Comments have types: question, suggestion, concern, appreciation,
    teaching moment
  - Typed comments change the tone — "suggestion" feels different from
    "request changes" even when the content is identical
  - Appreciation comments are first-class: "this is a clever solution"
    isn't noise, it's signal about what the team values
- Discussion threads that resolve independently
  - A PR with 8 comment threads can be approved when 7 are resolved
    even if 1 is still being discussed (if the author marks it
    non-blocking)
  - Eliminates the "one unresolved thread holds up the whole PR" problem
- Voice reviews: leave audio comments for complex feedback
  - "I'd explain this better by talking through it for 30 seconds than
    typing three paragraphs"
  - Auto-transcribed for searchability and async consumption

### The Reviewer's Experience
- Most review tools are designed for the author's workflow — the
  reviewer is an afterthought
  - What if the review tool was designed REVIEWER-FIRST?
  - Personalized diff presentation: the reviewer's preferred file order,
    syntax highlighting theme, annotation density
  - Context preloading: before you see the diff, you see a 30-second
    briefing — what this PR does, what areas it touches, what tests
    cover it
- Review fatigue detection
  - The tool notices when review quality drops — shorter comments, fewer
    suggestions, faster approvals
  - Gently suggests a break or a switch to a different PR that requires
    less cognitive load
  - Weekly review-load balancing: prevents one person from being the
    team's review bottleneck
- Review credit and visibility
  - Reviewing is invisible work — it doesn't show up in commit history
    or sprint velocity
  - A review profile that shows: reviews completed, average turnaround,
    comment depth, areas of expertise
  - Not gamification — visibility. Making the work visible so it can be
    valued

### Strangers Reviewing Strangers
- What happens when the reviewer doesn't know the codebase?
  - New team members can't give useful reviews because they lack context
  - But outsider reviews catch things insiders are blind to
  - "Fresh eyes" review mode: the reviewer explicitly doesn't know the
    codebase, and the PR must be self-explanatory enough for them to
    follow
  - This forces better PR descriptions, better commit messages, better
    code clarity — the review process improves the code before the
    review even starts
- Cross-team review exchange
  - Teams swap review capacity — your team reviews our PRs, we review
    yours
  - Prevents groupthink, spreads knowledge across the org, surfaces
    inconsistencies between team conventions
  - The "outsider tax" — reviews take longer but catch different things

## Connections

- **Time-Shifted Review + Review Decay** — together these create a
  review system that respects human rhythms instead of fighting them.
  Reviews arrive in natural gaps, and if the gap never comes, the
  review redistributes itself. No nagging, no guilt, no escalation.
- **Reviewable Units + The Reviewer's Experience** — breaking PRs into
  comprehension-sized chunks IS a reviewer-first design decision. The
  atomic unit changes from "what the author built" to "what the
  reviewer can hold in their head." The entire tool philosophy shifts
  when you make that move.
- **Review as Conversation + Strangers Reviewing Strangers** — typed
  comments (question, suggestion, teaching moment) become essential
  when the reviewer is an outsider. "I don't understand this" is a
  valuable signal from a stranger that would be embarrassing from a
  teammate. The conversation model has to make not-knowing safe.
- **Review Decay + Reviewable Units** — a large PR that decays could
  be automatically split into reviewable units as a recovery mechanism.
  "Nobody reviewed your 800-line PR in 3 days. Here are 4 reviewable
  units — want to re-request review on each one separately?"

## Hottest Threads

- **Reviewable units as the atomic concept** — this reframing generated
  the most energy. The insight that PRs are scoped to the author's work
  session rather than the reviewer's comprehension changes everything
  downstream: approval granularity, merge strategy, review load
  calculation. Every other branch in this riff looks different through
  this lens.
- **Review decay (inverse notification model)** — the idea that stale
  reviews get quieter instead of louder challenged an assumption nobody
  had questioned. The secondary insight — that lack of review IS
  feedback about PR quality — was the real prize.
- **Reviewer-first design** — the phrase "most review tools are
  designed for the author" landed hard. Context preloading, review
  fatigue detection, and review credit all flowed from this one
  perspective shift. The strongest threads often come from noticing
  whose experience is being centered and whose is being ignored.

## Open Questions

- How does "reviewable units" interact with git? Is it a layer on top
  of PRs, or does it require a different branching model (stacked PRs,
  patch series)?
- Review decay assumes reviews are somewhat fungible — anyone on the
  team can pick up a decayed review. What about PRs that require
  specific domain expertise? Does decay need an expertise-matching
  layer?
- Voice reviews sound great in theory — but are they searchable enough?
  Can you reference a voice comment in a follow-up discussion? What's
  the accessibility story?
- The "strangers reviewing strangers" concept surfaces a tension: review
  quality vs. review diversity. How do you measure whether cross-team
  reviews are actually catching different things, or just slower?
- Review fatigue detection requires some model of "normal" review
  behavior per person. How do you build that model without it feeling
  like surveillance — the same tension that appeared in the adaptive
  CLI riff?
