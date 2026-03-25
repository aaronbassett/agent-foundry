# Session Example: Developer CLI That Learns Your Patterns

A condensed riff session demonstrating technique deployment, adaptive
dynamic, and session flow.

---

**User:** Riff on a CLI tool that learns how you work and adapts to you.

**Claude:** Three angles right off the top:

First — a shell that notices your command sequences. You always run
`git pull` then `npm install` then `npm run dev` every morning. After
the third day, it offers to make that a single keystroke. Not aliases
you configure — patterns it discovers and proposes.

Second — error correction that gets personal. You always typo `dcoker`
for `docker`. Most shells suggest the fix once. This one learns YOUR
specific typos and auto-corrects silently, like a phone keyboard that's
trained on your thumbs.

Third — contextual awareness. The CLI notices you use different tools in
different repos. In the frontend monorepo you live in `yarn` and `jest`.
In the infra repo it's `terraform` and `kubectl`. It shifts its
autocomplete priorities based on where you are, like code-switching
between languages depending on who you're talking to.

*[Annotation: Lead mode. Three opening angles using perspective shift
(the CLI as a personal assistant that sees your habits) to immediately
fan out the idea space. No preamble, no clarifying questions.]*

---

**User:** The pattern detection one is interesting. But I don't want
it to feel creepy — like it's surveillance.

**Claude:** That tension is the whole design problem. What if the
metaphor isn't "watching you" but "developing muscle memory"? Your
hands know where the keys are — you didn't consciously teach them.
The CLI develops its own muscle memory FROM your muscle memory.

And that reframe changes the interaction model completely. Muscle memory
doesn't announce itself. It doesn't pop up and say "I noticed you do
X." It just... makes X easier. The `git pull && npm install && npm run dev`
sequence starts auto-completing after you type `g` in that repo. No
notification. No "would you like to save this workflow?" Just quiet
accommodation. You only notice it when you pause and realize things got
faster.

The creepy version is "I've been tracking your commands." The muscle
memory version is "your tool got better at being your tool."

*[Annotation: Amplify mode. Word pivot — "watching/surveillance" pivoted
to "muscle memory," which reframes the entire UX from notification-based
to ambient. Building on the user's concern rather than dismissing it.]*

---

**User:** Yeah, muscle memory is good. It should be invisible until you
want to see it.

**Claude:** "Invisible until you want to see it" — let's hold that
phrase and flip something. What if the most interesting thing about the
tool isn't what it learns but what it reveals? You run `cli inspect` and
it shows you a map of your own habits. How you actually spend your
terminal time. The commands you run most. The sequences you repeat. The
repos where you're most active. The hours you're most productive.

It's a mirror, not a coach. It doesn't tell you what to change. It
shows you what you do. And the insight might be surprising — you think
you spend your day coding, but the CLI shows you spend 40% of your
terminal time on deployment-related commands across five different repos.
That's not a problem to fix. That's self-knowledge.

So now there are two products hiding in one: the adaptive tool that
learns silently, and the reflective surface that shows you yourself.

*[Annotation: Challenge mode. Signal amplification — the user's phrase
"invisible until you want to see it" gets amplified into an entirely
new product angle (self-reflection/analytics). Shifts from building on
the user's direction to pushing the idea somewhere they hadn't aimed.]*

---

**User:** Oh that's cool. Like a fitness tracker but for your terminal.
What would the "stats" look like?

**Claude:** Yes, and — a fitness tracker for your terminal. But
fitness trackers went through an evolution, right? First generation was
raw numbers: steps, calories, heart rate. Boring. Second generation was
streaks and gamification. Effective but eventually annoying. Third
generation is the interesting one: patterns over time. Your resting
heart rate trending down over months. Sleep quality correlating with
activity levels.

The CLI stats should skip straight to third generation. Not "you ran
312 git commands today" but "your commit frequency is 3x higher on
Tuesdays" and "you context-switch between repos 40% less when you start
the day in the infra repo." Stuff you didn't know and couldn't have
figured out by feel.

And here's the dangerous-but-interesting thread: what happens when the
team uses this? Not sharing raw data — sharing patterns. "Our team's
deploy-to-rollback ratio improved this quarter." "Average time between
first test failure and green build dropped by half." The individual
tool becomes an organizational sensor. This one has legs, but it's also
where the creepy-factor comes roaring back.

*[Annotation: Amplify mode. "Yes, and..." builds on the user's fitness
tracker analogy, then metaphor mutation evolves "fitness tracker" through
its generational arc (raw stats -> gamification -> pattern insight).
Closes with a soft signal on the team-sensor thread — flags it as hot
without forcing convergence.]*

---

**User:** I don't love the team angle. Keep it personal.

**Claude:** Noted, killing the team thread. Personal only.

So if it's purely personal, let's take something away. Subtract the
learning entirely. The CLI doesn't adapt, doesn't auto-complete, doesn't
build muscle memory. It ONLY reflects. A read-only mirror. You type
commands and it watches. The only feature is `cli reflect` — and it
shows you your week.

Is that a product? Actually, maybe. Developers don't have great tools
for understanding their own workflow. Time trackers measure hours. Git
logs measure output. Nothing measures the texture of how you work —
the rhythm, the patterns, the context-switching, the deep-focus blocks.
A terminal mirror that just shows you the shape of your day.

But stripped this bare, it feels more like a feature than a product.
What makes it worth installing on its own?

*[Annotation: Lead mode. Subtraction — removes the "learning/adaptive"
core feature to see what survives. Asks a genuine question at the end
to provoke direction without using AskUserQuestion — keeping it
conversational.]*

---

**User:** Honestly I think the learning part IS the product. The
reflection stuff could be a nice `--stats` flag but the hook is "your
CLI gets smarter the more you use it." What if it could learn across
tools, not just shell commands?

**Claude:** Now we're somewhere. Learning across tools. You start a
branch in git, open three files in your editor, run the test suite,
check a dashboard in the browser. Those are four different tools but
one workflow. The CLI can only see the terminal slice — but what if it
had hooks into the rest?

Think about it as a workflow nervous system. The terminal is the spine,
but it sends and receives signals from the extremities. Your editor
reports which files are open. Your browser reports which PR you're
reviewing. Your calendar reports that you have 20 minutes until the
next meeting. The CLI synthesizes all of that into context.

So you type `t` and the autocomplete is different depending on whether
you're mid-code-review (suggests `test` for the files in the PR),
post-meeting (suggests `todo` to capture action items), or in a
deep-focus block (suggests `terraform apply` because that's what you
were working on before the interruption). Same keystroke, different
intelligence based on full-spectrum context.

That's the constraint to wrestle with, though — how much context is
too much? What if it had to work with ONLY terminal signals and one
other source? Which one source gives you the most leverage?

*[Annotation: Amplify mode. Analogy — "workflow nervous system" with
terminal as spine and other tools as extremities. Then constraint game
at the end — "only one additional signal source" — to force depth
instead of letting the scope balloon.]*

---

**User:** Git. Git is the one source. Everything meaningful I do
eventually touches a git operation. Branches, commits, PRs — that's
the skeleton of my actual work.

**Claude:** Git-aware CLI. That's tight and buildable. Let me rapid-fire
some variants on what "git-aware" means:

1. **Branch-scoped memory.** The CLI learns different patterns per
   branch. On `feature/auth-migration` you're always running the auth
   test suite. On `fix/perf-regression` you're running benchmarks. Switch
   branches and your autocomplete priorities switch with you.

2. **Commit-rhythm detection.** The CLI notices you haven't committed
   in 90 minutes and subtly surfaces a reminder — not a notification,
   just bumps `git status` higher in the autocomplete. Muscle memory
   nudge.

3. **PR-context loading.** You check out a branch for review and the
   CLI pre-loads context: which files changed, what the tests cover, the
   commands the author ran most while building the feature (pulled from
   their CLI data, if shared). Your review environment bootstraps itself.

4. **Merge-conflict personality.** The CLI learns how YOU resolve
   conflicts. You always keep the incoming change for test files and the
   current change for config. It starts pre-selecting your likely
   resolution.

5. **Stale-branch awareness.** Branches you haven't touched in two
   weeks get flagged when you run `git branch`. Not deleted — just
   quietly annotated: "last touched 18 days ago, 3 commits ahead of
   main, tests last passed on March 7."

6. **Post-push suggestions.** You push to a feature branch and the CLI
   suggests the next step based on your pattern: "You usually open a
   PR after pushing to a feature branch. Run `gh pr create`?"

Number 1 is the sleeper. Branch-scoped memory means the CLI isn't just
learning YOU — it's learning you IN CONTEXT. That's a fundamentally
different kind of personalization.

*[Annotation: Lead mode. Idea mutation loop — six rapid-fire variants
on "git-aware," no evaluation between them, then highlights mutation #1
as the outlier worth pulling on. Energy was high from the user's
decisive contribution, so speed matched the moment.]*

---

**User:** Branch-scoped memory is really good. I also like the
stale-branch awareness — that's a small thing that would save me every
week. Let's wrap up.

**Claude:**

# Riff: Adaptive CLI That Learns Your Patterns

**Date:** 2026-03-25
**Seed:** A CLI tool that learns how you work and adapts to you

## Branches

### Pattern Detection
- Command sequence learning — discovers repeated workflows, offers
  single-keystroke shortcuts
  - "Muscle memory" model: no announcements, just quietly faster
    autocomplete
  - Distinguishes daily rituals from one-off sequences

### Personal Typo Correction
- Error correction trained on YOUR specific mistakes
  - Silent auto-correct vs. suggested correction (design tension)

### Context-Aware Autocomplete
- CLI shifts priorities based on repo, branch, time of day
  - Git as the primary context signal (branch-scoped memory)
  - Autocomplete reflects what you're working on, not just frequency

### Self-Reflection / Stats
- `cli reflect` or `--stats` flag: a mirror of your terminal habits
  - Third-generation metrics: patterns and correlations over time,
    not raw counts
  - "Shape of your day" — rhythm, context-switching, deep-focus blocks
  - Explicitly NOT a coaching tool — shows, doesn't prescribe

### Git-Aware Intelligence
- Branch-scoped memory — different learned patterns per branch
- Commit-rhythm nudges — surfaces `git status` when you haven't
  committed in a while
- Stale-branch awareness — quiet annotations on neglected branches
- Post-push suggestions based on your typical next step
- Merge-conflict resolution patterns — pre-selects your likely choices

### Cross-Tool Context (Explored, Scoped Down)
- "Workflow nervous system" concept — terminal as spine, other tools
  as extremities
  - Scoped to git as the one additional signal source
  - Full multi-tool version is interesting but out of scope for v1

## Connections
- Pattern Detection + Git-Aware Intelligence → branch-scoped memory IS
  pattern detection, just with git context as the scoping mechanism
- Self-Reflection + Git-Aware Intelligence → stats become meaningful
  when they map to branches and PRs, not just raw commands
- Context-Aware Autocomplete + Cross-Tool Context → autocomplete is the
  surface, context signals are the input — the value scales with
  signal quality

## Hottest Threads
- **Branch-scoped memory** — the user lit up here. It's specific,
  buildable, and genuinely novel. The insight: personalization scoped
  to context is more useful than global personalization
- **Muscle memory as UX model** — the pivot from "surveillance" to
  "muscle memory" resolved the core tension. Invisible-by-default
  accommodation instead of notification-based suggestions
- **Stale-branch awareness** — small utility, weekly value. The kind
  of feature that makes a tool sticky

## Open Questions
- How does the CLI store learned patterns? Local SQLite? Dotfiles?
  Something git-tracked so it travels with the repo?
- What's the cold-start experience? Is the CLI useful on day 1 before
  it's learned anything, or does it need a bootstrapping period?
- Privacy model: if branch-scoped patterns are shared for PR-context
  loading, what gets shared and what stays private?
- How does it handle multi-machine workflows? Developer uses a laptop
  and a remote dev server — do patterns sync?
