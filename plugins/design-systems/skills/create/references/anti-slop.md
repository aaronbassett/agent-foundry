# AI Slop DOs and DON'Ts — Web UI Design Reference

**Purpose:** A reference guide for DESIGN.md files.

This document exists because LLMs are statistical pattern matchers. They reproduce the median of their training data — which, for web UI, means Tailwind defaults, tutorial code, and SaaS template boilerplate published between 2019 and 2024. When an LLM generates a UI without explicit constraints, it gravitates toward the most-replicated patterns in that corpus: purple/indigo gradients, Inter typeface, three-column icon grids, glassmorphism, sparkle emojis, and "Transform your X" hero copy. These patterns are not bad because they are common — they are bad because they signal an absence of intentional design. Every item in this document is a concrete, detectable pattern, not an aesthetic preference.

Use this document to:
- Constrain generation before the first line of code is written (DESIGN.md)
- Check generated output against known AI tells during review

---

## Section 1: Typography

### DON'T

| Pattern | Why it's a tell |
|---|---|
| Use Inter, Roboto, Open Sans, Lato, or Arial as primary typeface | Statistical defaults — these appear in the majority of AI-generated interfaces because they are the most common choices in Tailwind's default config and tutorial screenshots |
| Use weight range 400 vs 600 for contrast | Timid, produces invisible hierarchy — the difference is too small to create visual tension or guide the eye |
| Use 1.5x size jumps between type scale steps | Produces a generic flat visual rhythm with no drama or emphasis |
| Use gradient text on hero headings via `-webkit-background-clip: text` | Hard to read at smaller sizes, fails accessibility contrast requirements, and is one of the most overused visual tricks in AI-generated hero sections |
| Place a large Lucide or Heroicon SVG icon above every heading in feature sections | Appears in nearly every AI-generated feature section — the icon-above-heading pattern is a direct result of AI reproducing feature section tutorials verbatim |
| Use extreme redundancy in UX writing, e.g. "Our Features / Here are our features" | A known AI verbosity tell — the model restates the heading in the body text because it is filling space rather than communicating |

### DO

- Use a distinctive typeface with a clear point of view — consider Playfair Display, Fraunces, Crimson Pro, Clash Display, Satoshi, Cabinet Grotesk, IBM Plex, Bricolage Grotesque, or Newsreader
- Pair contrasting typographic styles — a serif for display, a grotesque for body; a slab for headings, a humanist sans for UI
- Use extreme weight contrast: combine 100 or 200 weights with 800 or 900 weights to create real hierarchy
- Use 3x or larger size jumps between key scale steps (e.g., 12px body, 36px heading, 96px display) rather than gentle progressions
- Write concise, specific UX copy that speaks to a concrete user outcome — no filler, no restatements
- Define and enforce a strict type scale as a design token before writing component code

---

## Section 2: Colour & Theme

### DON'T

| Pattern | Why it's a tell |
|---|---|
| Default to purple/indigo gradients on white | Caused by Tailwind's `bg-indigo-500` and `bg-purple-600` saturating the training corpus — it is the single most recognisable AI colour choice |
| Use gradient buttons, gradient list markers, or gradient hero backgrounds as a default treatment | Consistently ranked in the top three cited AI visual tells across design critique communities |
| Use timid, evenly-distributed palettes of 4-6 colours at equal saturation | Produces emotionally cold interfaces — no dominant colour, no tension, no mood |
| Use pure `#000000` black and `#ffffff` white | Flat and unintentional — pure black and white have no hue, which signals a default rather than a decision |
| Place grey text on coloured backgrounds | Lifeless — use hue-tinted neutrals that pick up the background's colour temperature instead |
| Default to dark mode to make glows and neons look interesting | Dark-mode-as-crutch: using dark mode to rescue a palette that would look cheap in light mode is a design failure, not a design choice |
| Use glassmorphism as the default surface treatment | `backdrop-filter: blur` with semi-transparent surfaces was a 2021–2022 trend; it is now a primary AI crutch and dates the work immediately |
| Use cyan-on-dark neon for "hacker aesthetic" | Lazy visual shorthand — every AI-generated developer tool defaults to this palette |

### DO

- Establish one dominant colour and one sharp accent — the ratio should be asymmetric, not equal
- Define all colour values as CSS custom properties from the first line of CSS, before writing any component styles
- Draw palette inspiration from non-digital sources: textiles, architecture, print, natural materials — this produces colour relationships that feel considered rather than computed
- Use hue-tinted neutrals — your greys should carry a slight warm or cool cast derived from the dominant palette colour
- Make every colour choice deliberate and nameable: if you cannot explain why a colour is there, remove it

---

## Section 3: Layout & Structure

### DON'T

| Pattern | Why it's a tell |
|---|---|
| Default to a three-column icon grid as the feature section | The most replicated AI layout pattern — it appears in the majority of AI-generated SaaS landing pages without variation |
| Center all text and elements by default | Safe equals forgettable — centred layouts avoid compositional decisions and produce pages with no visual direction |
| Use cards everywhere, including card-in-card nesting | AI defaults to cards because card components are the most common example in component library documentation |
| Use identical cards with the same size, weight, and padding throughout | Eliminates all hierarchy — when every card is equal, nothing is important |
| Use a bento grid as the hero or primary feature section | An overused genre marker — bento grids signal "AI-generated product site" as clearly as the purple gradient |
| Use uniform spacing throughout the page | Mathematically consistent but emotionally cold — intentional design uses spacing variation to create rhythm and emphasis |
| Apply one border-radius value to every element | Over-consistency is generic — mixing sharp corners and rounded corners creates intentional contrast |
| Apply `border-radius: 8px`–`12px` with `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` to every card | This exact combination appears on millions of AI-generated card components — it is the single most recognisable AI CSS fingerprint |
| Add a left border accent (`border-left: 4px solid var(--accent)`) to all cards | Ubiquitous AI decorative pattern — it appears whenever a model wants to add "visual interest" to a card without making a real design decision |
| Default to modals for all contextual actions | AI defaults to modals because they are the most common pattern in UI tutorial code, regardless of whether a modal is the right interaction |

### DO

- Break the three-box grid — use asymmetric layouts, featured items at 2x or 3x width, or list-based feature presentations
- Default to left-aligned layouts; centre only for specific moments (pull quotes, empty states, standalone CTAs)
- Use spacing as a design element — vary the density deliberately to create sections that breathe and sections that press
- Define 2–3 border-radius tokens (e.g., sharp `2px`, default `8px`, pill `9999px`) and apply them with intent, not uniformly
- Replace modals with inline expansion, slide-out panels, or page transitions — keep users in context
- Establish the layout system (grid, spacing scale, breakpoints) before writing any component code

---

## Section 4: Hero Section & Copywriting

### DON'T

| Pattern | Why it's a tell |
|---|---|
| Write hero headings like "Transform your X", "Launch faster", "Build your dreams", or "Create without limits" | Primary AI copy indicators identified across 500+ analysed sites — these phrases are statistically dominant in the training corpus for SaaS landing pages |
| Use excessive em-dashes in body copy | A well-documented AI writing tell — models overuse em-dashes because they appear frequently in polished long-form writing in the training data |
| Include sparkle emojis (✨) in headings or CTAs | The single most cited AI giveaway in design critique — sparkle emojis appear in AI copy as a substitute for genuine excitement |
| Scatter emojis throughout headings and lists | The top visual tell for AI-generated marketing copy — real copywriters use emojis sparingly and intentionally |
| Use fake testimonials attributed to names like "Sarah Chen" with generic stock face photography | Immediately destroys credibility — the combination of a generic multicultural name and a stock photo is recognisable as a fabrication |
| Use a typing-effect animation on the hero heading for non-technical products | Overused to the point of being meaningless — it implies the product is about code or speed without earning that association |
| Apply scroll-triggered fade-in on every section | The canonical vibe-coded page tell — when every section fades in on scroll, the animation communicates nothing |

### DO

- Write hero copy that names a specific, concrete outcome for a specific user type — not aspiration, but result
- Provide one primary CTA with a visually distinct secondary option — never treat both actions as equal weight
- Use real testimonials with full names and verifiable context, or omit testimonials entirely
- Use animated text (typing, swapping, morphing) only when the animation is semantically meaningful to the product
- Limit page-load animation to one orchestrated sequence that establishes the page's visual identity — do not animate everything

---

## Section 5: Motion & Interaction

### DON'T

| Pattern | Why it's a tell |
|---|---|
| Use bounce or elastic easing: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | This easing was trendy in 2015 and has been in UI tutorial code ever since — it now reads as template-level work |
| Apply aggressive card hover effects: large lift, strong shadow amplification, `scale > 1.05` | Overdone and visually noisy — when every card leaps forward on hover, the interaction has no meaning |
| Animate layout properties: `height`, `width`, `top`, `left` | Causes jank by triggering layout recalculation — these properties cannot be hardware-accelerated |
| Use purposeless animations: scroll triggers on every paragraph, sparkle burst on button click, floating particle backgrounds | Decoration over function — animation should convey state change, not add visual noise |
| Ship with zero micro-interactions: no button press feedback, no loading state, no progress indication | Template-driven thinking — a page with no micro-interactions was assembled from static component examples, not designed as an interactive experience |

### DO

- Use subtle 2–4px hover lifts with `translateY` combined with a small opacity shift — communicates interactivity without drama
- Animate only `transform` and `opacity` — these properties are composited by the GPU and produce smooth 60fps motion
- Use natural easing curves: `ease` or the Material standard `cubic-bezier(0.4, 0, 0.2, 1)` — they feel physical without bouncing
- Implement visible focus states and press feedback (`:active` state reduction) on all interactive elements
- Add loading indicators and skeleton screens for any async operation longer than 200ms

---

## Section 6: Component & Code Patterns

### DON'T

| Pattern | Why it's a tell |
|---|---|
| Ship with the default browser favicon or a placeholder icon | Signals that the site was never customised — the first asset a real project replaces |
| Display an outdated copyright year in the footer | An immediate trust signal — an AI-generated page often has no mechanism for updating the year |
| Include non-functional social media links (`href="#"` or `href="/"`) | Placeholder links break trust — a user who clicks a non-working social link will not return |
| Use inconsistent icon sizing, e.g. 32–48px icons above body text | A known AI tell — the model reproduces the icon size from tutorial code without adapting it to the design context |
| Mix icon libraries (e.g. Lucide + Heroicons + Font Awesome on the same page) | Inconsistency in icon style reveals AI-assembled code — each component was generated independently from different training examples |
| Style all buttons at equal visual prominence | AI makes everything important, which makes nothing important — button hierarchy is a fundamental design decision |
| Skip heading levels or break heading hierarchy (e.g., H1 → H4) | Common in AI-generated HTML where headings are chosen by visual size rather than semantic structure |
| Apply `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` verbatim to card components | This exact value appears in millions of AI-generated components — it is the default Tailwind `shadow-md` translated to raw CSS |

### DO

- Establish a button hierarchy with primary, secondary, and tertiary variants — assign roles before assigning styles
- Use one icon library throughout, sized at `1em` relative to surrounding text so it scales naturally with type
- Write semantic HTML: `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>` — structure communicates meaning to assistive technology
- Add ARIA labels to all interactive elements without visible text labels, and verify keyboard navigation through every flow
- Use coloured box-shadows that pick up the hue of the element they shadow — `box-shadow: 0 4px 16px rgba(99, 60, 220, 0.3)` on a purple button rather than a grey shadow
- Implement form validation with inline error states — never rely on browser-default validation UI

---

## Section 7: Design System Discipline

### DON'T

- Start writing component code before defining design tokens — components built without tokens accumulate inconsistency that is expensive to fix later
- Allow multiple values for the same design concept, e.g. five different border-radius values used across components without a token governing each
- Copy a layout or component from a reference without adapting it to the project's token system
- Let components on different pages behave or look differently without an intentional reason documented in the design system
- Ship to production without testing on a real mobile device — simulated viewport in DevTools does not replicate touch interaction, font rendering, or performance

### DO

- Define the design system first: establish tokens for spacing scale, colour palette, border-radius, type scale, and shadow before any component code exists
- Use 2–3 spacing units built on a consistent base (e.g., 4px multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96) — avoid arbitrary values
- Ensure every component references the token system — no hardcoded hex values, pixel values, or shadow strings outside the token definitions
- Test that all interactions (hover, focus, active, disabled, loading, error) work correctly in the browser before marking a component complete
- Perform a final consistency pass before delivery: check that spacing, colour, type, and interaction patterns are uniform across all pages and states

---

## Supplementary Research Findings

### CSS Values to Ban

These exact strings have been identified across AI-generated interfaces at high frequency. Their presence in a codebase is a strong signal of unreviewed AI output:

```css
/* Purple/indigo gradient — the single most common AI gradient */
linear-gradient(135deg, #667eea 0%, #764ba2 100%)

/* Glassmorphism boilerplate — copied verbatim from tutorials */
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.1);
border: 1px solid rgba(255, 255, 255, 0.2);

/* The universal AI card style — uniform radius + padding combo */
border-radius: 16px;
padding: 24px;
/* (when applied identically to every card on the page) */
```

### Copy Patterns to Avoid

These phrases appear in AI-generated marketing copy with high frequency and signal low-effort generation:

- "Build the future of work"
- "Your all-in-one platform"
- "Scale without limits"
- Hedging language: "may help you", "can potentially", "might be useful for"
- Generic superlatives: "best-in-class", "cutting-edge", "state-of-the-art", "world-class"

### Visual Asset Tells

- Stock photography depicting a diverse group of people looking at a laptop in a well-lit, minimal office — this specific image type is the most common AI-selected hero photograph
- AI-generated illustrations with a slightly-too-smooth quality, slightly-too-symmetrical composition, and a plastic material rendering — the absence of imperfection and texture marks them as generated

### The Hero Metric Layout Pattern

A specific layout that appears in AI-generated product pages with high frequency: a large number (e.g., "10,000+"), a small label below it (e.g., "Active users"), and a short gradient accent line or dot beside or below the number. This pattern appears in groups of three, evenly spaced, in the hero or social proof section. It is not inherently wrong, but its appearance in that exact form signals template reuse.

### Snap Button Transitions

Buttons with no transition property — state changes that snap instantly from default to hover — are a tell for AI-generated CSS. The model writes the hover state but omits `transition`, producing an abrupt, unpolished interaction.

### Hover States That Do Nothing

Interactive elements where the hover state is identical to the default state (no colour change, no shadow, no cursor change) are common in AI-generated HTML. The model adds the element but does not complete the interaction design.

---

## Instant Giveaways Checklist

Use this checklist during review. Each item is a concrete, detectable AI tell. A page with three or more of these present has not been sufficiently constrained or reviewed.

- [ ] Purple/indigo gradients used as default colour treatment
- [ ] Inter, Roboto, Open Sans, or Arial as the primary typeface
- [ ] Gradient text on the hero heading via `-webkit-background-clip: text`
- [ ] Three-column grid with an icon above each heading as the feature section
- [ ] Sparkle emojis (✨) or heavy emoji use in headings
- [ ] Hero copy matching "Transform your X", "Launch faster", or equivalent
- [ ] Every card identical in size, shadow, and padding
- [ ] `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` applied verbatim to cards
- [ ] Scroll-triggered fade-in on every section
- [ ] Fake testimonials or names without verifiable attribution
- [ ] Non-functional social media links (`href="#"` or `href="/"`)
- [ ] Missing or unmodified default favicon
- [ ] Outdated copyright year in the footer
- [ ] Broken heading hierarchy (H1 → H3 → H2, or H1 → H4)
- [ ] Forms with no inline validation or error states
- [ ] Dark mode used as a crutch to make glow/neon effects look credible
- [ ] Bounce or elastic easing: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`
- [ ] All buttons styled as primary actions with equal visual weight
- [ ] Glassmorphism applied as a default surface treatment globally
- [ ] Nested cards (card inside a card without distinct visual purpose)

---

## Confidence Signals Checklist

These are positive indicators that a UI has been intentionally designed rather than statistically generated.

- [ ] Distinctive typeface with meaningful weight contrast (100/200 paired with 800/900)
- [ ] Colour palette derived from a named aesthetic or a defined token system
- [ ] At least one asymmetric or non-grid layout element
- [ ] One primary high-impact animation with a clear semantic purpose
- [ ] Semantic HTML throughout (`<nav>`, `<main>`, `<article>`, `<section>`, etc.)
- [ ] ARIA labels present on all interactive elements without visible text labels
- [ ] Mobile behaviour adapted to touch context, not merely shrunk from desktop
- [ ] Consistent, purposeful hover and focus states on all interactive elements
- [ ] Design tokens defined centrally and referenced by all components
- [ ] Real, named testimonials with verifiable context (if testimonials are present)
