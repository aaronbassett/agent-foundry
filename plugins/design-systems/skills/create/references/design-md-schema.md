# DESIGN.md Schema Reference

> This document defines the strict section schema for all generated DESIGN.md files. Section order, section names, and required subsections are non-negotiable. The create skill reads this reference to enforce structural compliance before output. The review skill reads this reference to know exactly which sections and subsections to audit.

---

## Why Strict Schema?

**Reliable parsing by the review skill.** The review skill locates sections by their exact headings. If a heading varies even slightly — "North Star" instead of "1. Creative North Star" — the parser misses it and flags the document as incomplete. Consistency is a precondition for automation.

**Consistent experience across projects.** Designers and developers working across multiple projects should be able to navigate any DESIGN.md without hunting. The same section at the same position every time reduces cognitive overhead and makes cross-referencing between systems fast.

**Mechanical enforcement of required elements.** A schema with named slots forces the author (human or AI) to address every dimension of a design system. Omitting "Elevation & Depth" is not a stylistic choice — it is a gap. The schema makes gaps visible rather than acceptable.

---

## Required Sections

Every DESIGN.md must contain exactly 7 numbered sections, in order, with the exact headings shown below.

---

## Section 1: Creative North Star

### Exact Heading

```
## 1. Creative North Star
```

### Required Subsections

#### `### North Star: "[Poetic Name]"`

The poetic name must appear in double quotes as part of the heading. This is 2–3 paragraphs describing the aesthetic direction, the emotional quality the system should evoke, and the sources of inspiration. This is not a feature list — it is a mood, a feeling, a design philosophy expressed in concrete language.

**Well-formed example:**

```markdown
### North Star: "Cartographer's Lamp"

This system lives in the amber hour between dusk and dark — the moment when a cartographer leans over a hand-drawn map, tracing coastlines under the warmth of a glass-chimney lamp. Every surface should feel like aged vellum: present and tactile, never sterile. The interface is a working document, not a showpiece.

Inspiration draws from mid-century scientific illustration, the typographic care of the Penguin Classics paperback series, and the unhurried precision of letterpress printing. The system should feel like it has been used before — worn in the right places, confident in its proportions.

The emotional target is *productive intimacy*: the feeling of a tool that understands your work and stays out of your way. Nothing should shimmer, pulse, or demand attention. The interface recedes; the content leads.
```

#### `### Anti-Moodboard`

A list of named styles, sites, or movements explicitly rejected, each with a one-line rationale. The anti-moodboard is as important as the positive direction — it prevents aesthetic drift and stops AI generation from regressing to statistical defaults.

Each entry must name the thing being rejected and state concretely why it is wrong for this system.

**Well-formed example:**

```markdown
### Anti-Moodboard

- **Standard SaaS Template** — Rejected because the three-column icon grid and centered hero layout are the statistical default of AI generation; this system must be distinguishable from a Figma Community freebie.
- **Notion-Clone Minimalism** — Rejected because the white-page, gray-text, borderless-table aesthetic erases personality entirely and reads as "unfinished" rather than "considered."
- **Cyberpunk/Neon Dark Mode** — Rejected because glowing text on near-black violates the warmth target and belongs to a different emotional register entirely.
- **Corporate Glassmorphism** — Rejected because frosted panels with purple gradients have become the visual shorthand for "AI startup" and undermine any claim to distinctiveness.
```

#### `### Core Prohibitions`

A numbered list of absolute rules that apply to every component, every screen, every state. These must be:

- Mechanically checkable (a reviewer can verify compliance without judgment)
- Stated as negatives ("No X" not "Avoid X")
- Essential — things that, if violated, break the North Star irreparably

**Well-formed example:**

```markdown
### Core Prohibitions

1. No 1px solid borders used as the primary sectioning mechanism. Use tonal surface shifts instead.
2. No pure `#000000` or `#FFFFFF` in the palette. The darkest surface is `#1A1612`; the lightest is `#FAF7F2`.
3. No centered body text. Center alignment is reserved for single-line labels and display headings only.
4. No gradient backgrounds on interactive elements. Gradients are decorative surfaces, not affordance signals.
5. No system-default font fallbacks rendered visibly. All typography must load from the defined type scale.
```

---

## Section 2: Colors & Surface Architecture

### Exact Heading

```
## 2. Colors & Surface Architecture
```

### Required Subsections

#### `### Palette`

Named design tokens with hex values, organized by role. The following token categories are required:

**Surface tokens** (layering from lowest to highest elevation):
- `surface`, `surface-dim`, `surface-bright`
- `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`

**Primary / Secondary / Tertiary** (each with container and on- variants):
- `primary`, `on-primary`, `primary-container`, `on-primary-container`
- `secondary`, `on-secondary`, `secondary-container`, `on-secondary-container`
- `tertiary`, `on-tertiary`, `tertiary-container`, `on-tertiary-container`

**Outline**:
- `outline`, `outline-variant`

**On-surface**:
- `on-surface`, `on-surface-variant`

**Well-formed example:**

```markdown
### Palette

**Surface**
| Token | Hex | Usage |
|---|---|---|
| `surface` | `#F5F0E8` | Page background |
| `surface-dim` | `#DDD8D0` | Subdued background, disabled areas |
| `surface-bright` | `#FAF7F2` | Elevated modal backgrounds |
| `surface-container-lowest` | `#FFFFFF` | Only for print-export contexts |
| `surface-container-low` | `#EDE8E0` | Sidebar, secondary panels |
| `surface-container` | `#E5E0D8` | Card backgrounds |
| `surface-container-high` | `#DDD8CF` | Nested card backgrounds |
| `surface-container-highest` | `#D5D0C7` | Deepest inset components |

**Primary**
| Token | Hex |
|---|---|
| `primary` | `#5C3D1E` |
| `on-primary` | `#FAF7F2` |
| `primary-container` | `#E8D5B8` |
| `on-primary-container` | `#3A2210` |

**Secondary / Tertiary** — (same pattern, omitted for brevity)

**Outline**
| Token | Hex |
|---|---|
| `outline` | `#8C7B6A` |
| `outline-variant` | `#C4B8A8` |

**On-surface**
| Token | Hex |
|---|---|
| `on-surface` | `#1A1612` |
| `on-surface-variant` | `#4A4038` |
```

#### `### Surface Hierarchy`

Explicit rules for which surface token to use at each layer of the UI. Must define at minimum four levels:

- **Base** — the page/body background
- **Section** — major content regions (sidebar, main, footer)
- **Component** — cards, panels, dialogs
- **Interactive** — elements that receive hover/focus states

**Well-formed example:**

```markdown
### Surface Hierarchy

- **Base (page):** `surface` — applied to `<body>` and full-bleed backgrounds.
- **Section:** `surface-container-low` — applied to sidebar, navigation rail, footer zone.
- **Component:** `surface-container` — applied to cards, info panels, form sections.
- **Nested Component:** `surface-container-high` — applied to components embedded inside other components (e.g., a code block inside a card).
- **Interactive Surface:** `surface-container-highest` — applied to elements that pulse between states (e.g., a selected list item or a hovered row).
```

#### `### Color Rules`

Explicit rules for how color is applied to borders, shadows, background transitions, and hover states. These rules prevent ad hoc decisions during component implementation.

**Well-formed example:**

```markdown
### Color Rules

- Borders use `outline-variant` for decorative separation; `outline` for interactive boundaries (inputs, focused elements).
- No `box-shadow` with black at any opacity. Shadows are tinted with the nearest surface color.
- Background transitions on hover use a one-step surface elevation increase (e.g., `surface-container` → `surface-container-high`), never a color shift to a different hue.
- Text on any container surface must use `on-surface` or `on-surface-variant`; never a primary color for body copy.
- Disabled states use `on-surface` at 38% opacity; never a separate gray token.
```

---

## Section 3: Typography

### Exact Heading

```
## 3. Typography
```

### Required Subsections

#### `### Type Scale`

A table defining all type levels. The table must include these columns: Level, Token, Font Family, Size (rem), Weight, Line-Height.

The following 9 levels are required, in this order:

| Level | Token |
|---|---|
| Display Large | `display-lg` |
| Headline Large | `headline-lg` |
| Title Large | `title-lg` |
| Title Small | `title-sm` |
| Body Large | `body-lg` |
| Body Medium | `body-md` |
| Label Large | `label-lg` |
| Label Medium | `label-md` |
| Label Small | `label-sm` |

**Well-formed example:**

```markdown
### Type Scale

| Level | Token | Font Family | Size (rem) | Weight | Line-Height |
|---|---|---|---|---|---|
| Display Large | `display-lg` | Fraunces | 3.5625 | 300 | 1.12 |
| Headline Large | `headline-lg` | Fraunces | 2rem | 400 | 1.2 |
| Title Large | `title-lg` | Source Serif 4 | 1.375rem | 600 | 1.27 |
| Title Small | `title-sm` | Source Serif 4 | 0.875rem | 600 | 1.43 |
| Body Large | `body-lg` | Source Serif 4 | 1rem | 400 | 1.5 |
| Body Medium | `body-md` | Source Serif 4 | 0.875rem | 400 | 1.43 |
| Label Large | `label-lg` | JetBrains Mono | 0.875rem | 500 | 1.43 |
| Label Medium | `label-md` | JetBrains Mono | 0.75rem | 500 | 1.33 |
| Label Small | `label-sm` | JetBrains Mono | 0.6875rem | 500 | 1.45 |
```

#### `### Pairing Logic`

A prose explanation of why each font was chosen, what it communicates, and how the fonts interact with one another. This is not a list of font features — it is a design rationale.

**Well-formed example:**

```markdown
### Pairing Logic

**Fraunces** handles display and headline roles because its optical size features lean into the "lamp-lit manuscript" feeling: the letterforms have personality and warmth without tipping into nostalgia. Its variable weight axis lets display headings feel deliberate at 300 while staying legible down to headline size.

**Source Serif 4** carries all reading-weight text. It was designed for editorial contexts — longer passages, mixed-weight hierarchies — and its proportions hold up at small sizes on screen without losing the serif character that keeps the system grounded in print tradition.

**JetBrains Mono** takes all label and metadata roles. The monospaced rhythm creates a clear visual separation from editorial content and reinforces the "working document" register. Its generous x-height keeps labels legible at 11px without requiring letter-spacing hacks.

The three fonts are unified by a shared warmth: none of them read as "neutral." They each carry a slight historical inflection, which means they agree with each other without competing.
```

---

## Section 4: Spacing & Layout

### Exact Heading

```
## 4. Spacing & Layout
```

### Required Subsections

#### `### Spacing Scale`

The base unit must be defined explicitly. A table must map token names to rem values, pixel equivalents, and usage guidance.

**Well-formed example:**

```markdown
### Spacing Scale

**Base unit:** 4px (0.25rem)

| Token | Value (rem) | Value (px) | Usage |
|---|---|---|---|
| `spacing-1` | 0.25rem | 4px | Icon padding, tight inline gaps |
| `spacing-2` | 0.5rem | 8px | Label-to-icon gap, chip internal padding |
| `spacing-3` | 0.75rem | 12px | Small component internal padding |
| `spacing-4` | 1rem | 16px | Standard internal padding (cards, inputs) |
| `spacing-5` | 1.25rem | 20px | Paragraph-to-heading gap |
| `spacing-6` | 1.5rem | 24px | Section internal padding, list item gap |
| `spacing-8` | 2rem | 32px | Component-to-component gap |
| `spacing-10` | 2.5rem | 40px | Section-to-section gap (mobile) |
| `spacing-12` | 3rem | 48px | Section-to-section gap (desktop) |
| `spacing-16` | 4rem | 64px | Major layout breaks, hero padding |
```

#### `### Layout Rules`

Explicit rules for grid behavior, alignment, and responsive strategy. These should be concrete enough that an implementer does not need to make judgment calls.

**Well-formed example:**

```markdown
### Layout Rules

- **Grid:** 12-column grid on desktop (≥1024px), 4-column on mobile. Gutter: `spacing-6` (24px). Margin: `spacing-8` (32px) desktop, `spacing-4` (16px) mobile.
- **Max content width:** 1280px, centered. Reading columns (prose) capped at 72ch.
- **Alignment:** All components align to the grid. No absolute positioning for layout — only for decorative overlays.
- **Responsive strategy:** Mobile-first. Breakpoints: 640px (sm), 1024px (lg), 1440px (xl). No breakpoint between sm and lg — the layout jumps directly.
- **Vertical rhythm:** All block-level vertical spacing uses spacing scale tokens. No arbitrary margins in component styles.
```

---

## Section 5: Elevation & Depth

### Exact Heading

```
## 5. Elevation & Depth
```

### Required Subsections

#### `### Layering Strategy`

A description of how depth is communicated in this system. The strategy must name the primary mechanism chosen from (or combining) these options:

- **Tonal shifts** — higher layers use lighter/different surface tokens
- **Colored shadows** — shadows tinted with the background or accent color
- **Hard offsets** — no blur, geometric shadow displacement
- **Blur/glass** — backdrop-filter frosted glass
- **Combination** — explicit statement of which mechanisms apply at which levels

**Well-formed example:**

```markdown
### Layering Strategy

This system communicates depth primarily through **tonal surface shifts**, not shadows. Each elevation level corresponds to a step up the surface container scale, creating a sense of layers without requiring light-source simulation.

Shadows are used sparingly and only for **floating** elements — modals, dropdowns, tooltips — that genuinely break out of the document flow. At those levels, shadows are warm-tinted (not black) to preserve the amber palette.

No blur or glass effects. The "cartographer's lamp" aesthetic depends on surfaces that feel solid and paper-like; transparency undermines that.
```

#### `### Shadow Definitions`

Named shadow tokens with exact CSS values for at minimum `shadow-sm`, `shadow-md`, and `shadow-lg`. If the system uses no shadows, an explicit statement is required: *"This system uses no box-shadow. Elevation is communicated entirely through surface token layering (see Surface Hierarchy)."*

**Well-formed example:**

```markdown
### Shadow Definitions

| Token | CSS Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 3px 0 rgba(90, 60, 30, 0.12), 0 1px 2px -1px rgba(90, 60, 30, 0.08)` | Raised cards, hovered list items |
| `shadow-md` | `0 4px 8px -2px rgba(90, 60, 30, 0.16), 0 2px 4px -2px rgba(90, 60, 30, 0.10)` | Dropdowns, popovers |
| `shadow-lg` | `0 12px 24px -4px rgba(90, 60, 30, 0.20), 0 4px 8px -2px rgba(90, 60, 30, 0.12)` | Modals, dialogs |

All shadows use a warm brown tint (`rgba(90, 60, 30, ...)`) derived from the primary color. Never `rgba(0, 0, 0, ...)`.
```

---

## Section 6: Components

### Exact Heading

```
## 6. Components
```

### Required Subsections

#### `### Buttons`

Must define three variants: Primary, Secondary, Tertiary. For each variant, must specify:

- Fill (background color token)
- Border (color token or "none")
- Text color (token)
- Border-radius
- Padding
- States: hover, focus, active, disabled

**Well-formed example:**

```markdown
### Buttons

**Primary Button**
- Fill: `primary`
- Border: none
- Text: `on-primary`
- Border-radius: `4px`
- Padding: `spacing-3` (12px) vertical, `spacing-6` (24px) horizontal
- Hover: Fill shifts to `primary` at 92% opacity + `shadow-sm`
- Focus: 2px `outline` offset ring, color `primary`
- Active: Fill shifts to `on-primary-container`, text `primary-container`
- Disabled: Fill `on-surface` at 12% opacity, text `on-surface` at 38% opacity, no pointer-events

**Secondary Button**
- Fill: `primary-container`
- Border: none
- Text: `on-primary-container`
- Border-radius: `4px`
- Padding: same as primary
- Hover: `shadow-sm`, fill lightens one tonal step
- Focus: 2px `outline` offset ring
- Active: Fill `primary` at 16% opacity overlay
- Disabled: same pattern as primary

**Tertiary Button**
- Fill: transparent
- Border: 1px `outline-variant`
- Text: `on-surface`
- Border-radius: `4px`
- Padding: same as primary
- Hover: Fill `on-surface` at 8% opacity
- Focus: 2px `outline` offset ring
- Active: Fill `on-surface` at 12% opacity
- Disabled: Border and text at 38% opacity
```

#### `### Cards & Containers`

Must specify: background surface token, border treatment, spacing, hover behavior, and an explicit statement about whether card nesting is allowed and how deeply.

**Well-formed example:**

```markdown
### Cards & Containers

**Standard Card**
- Background: `surface-container`
- Border: none (elevation communicated via surface token only)
- Padding: `spacing-6` (24px)
- Border-radius: `6px`
- Hover: background transitions to `surface-container-high` (200ms ease-out); no scale transform
- Shadow on hover: `shadow-sm`

**Nesting:** Cards may nest one level deep. A card on `surface-container` may contain a sub-component on `surface-container-high`. A component on `surface-container-high` must not contain another card — use a table or list instead. Three-level nesting is prohibited.
```

#### `### Input Fields`

Must specify: surface token, border, focus state, label treatment, error state, placeholder behavior.

**Well-formed example:**

```markdown
### Input Fields

- Surface: `surface-container-low`
- Border: 1px solid `outline-variant` (resting); 1.5px solid `outline` (hover); 2px solid `primary` (focus)
- Border-radius: `4px`
- Padding: `spacing-3` (12px) vertical, `spacing-4` (16px) horizontal
- Label: always visible above field (`title-sm`, `on-surface-variant`); never placeholder-as-label pattern
- Focus state: border becomes `primary`, label color shifts to `primary`
- Error state: border `error` token, label and helper text `error` token, error icon in trailing position
- Placeholder: `on-surface-variant` at 60% opacity; disappears on any input (not on focus)
- Disabled: surface `on-surface` at 4% opacity, border `on-surface` at 12% opacity, text `on-surface` at 38% opacity
```

#### `### Specialized Components`

Domain-specific components unique to this design system, with the same level of specification as the standard components above. If there are no specialized components, this section must contain the explicit statement: *"None for this system."*

**Well-formed example:**

```markdown
### Specialized Components

**Document Annotation Marker**
- A small amber pill (background `primary-container`, text `on-primary-container`) used to tag inline document references.
- Height: 20px, padding: `spacing-1` (4px) horizontal, font: `label-sm`
- Hover: background `primary`, text `on-primary`
- Maximum 2 markers may stack inline without a line-break.

**Map Coordinate Badge**
- A monospaced label in `label-md` (JetBrains Mono) inside a `surface-container-highest` pill.
- Used to display geographic coordinates or structured identifiers.
- Not interactive; no hover state.
```

---

## Section 7: Do's and Don'ts

### Exact Heading

```
## 7. Do's and Don'ts
```

### Required Subsections

#### `### Do`

A bulleted list of positive guidance, each item with a rationale. These should be specific to the system — not generic best-practice platitudes.

**Well-formed example:**

```markdown
### Do

- **Use surface elevation to create depth.** Tonal layering communicates structure without visual noise. A card on `surface-container` against a `surface` page background is immediately readable as elevated.
- **Let typography carry hierarchy.** The Fraunces / Source Serif 4 pairing has enough weight range to establish hierarchy through size and weight alone. Trust the scale.
- **Use `outline-variant` for decorative lines.** Hairlines between sections should feel like the grain of the paper, not a constructed border.
- **Keep interactive states legible at a glance.** Hover, focus, active, and disabled must be visually distinct without animation. Someone scanning the UI should know which state an element is in before they interact with it.
- **Apply spacing-scale tokens only.** Every margin, padding, and gap must come from the spacing scale. One-off values (`padding: 13px`) are a sign the component needs redesign.
```

#### `### Don't`

A bulleted list of prohibitions. This section must include:

1. All Core Prohibitions (from Section 1) restated in context
2. At least 3 items from the AI Slop checklist (see `anti-slop.md`), each with a rationale specific to this system

**Well-formed example:**

```markdown
### Don't

- **Don't use 1px solid borders for sectioning.** This system communicates structure through surface tokens. A border where a surface shift belongs is a sign the layout needs rethinking, not decorating.
- **Don't use pure `#000000` or `#FFFFFF`.** The system's darkest and lightest values are `#1A1612` and `#FAF7F2`. Pure black or white reads as harsh and breaks the warm-amber palette coherence.
- **Don't center body text.** Center alignment belongs to single-line display headings and standalone labels. Centered paragraphs are difficult to read and signal a slide-deck aesthetic, not a document aesthetic.
- **Don't use gradient backgrounds on buttons or interactive elements.** Gradients imply dimensionality that conflicts with the flat, paper-surface language of this system. They also age badly and trend-date the design.
- **Don't use Inter, Roboto, or system-ui as a fallback that renders visibly.** If the font stack falls back, something is broken. Fix the font loading, don't accept the fallback.
- **Don't use the three-column icon-card grid for feature sections.** This is the statistical default of AI-generated SaaS layouts and signals zero intentionality. (AI Slop: "Feature Grid")
- **Don't add floating blob/gradient background shapes.** Organic SVG blobs as page decorations are a design trend marker, not a design decision. They undermine the cartographic precision of this system. (AI Slop: "Blob Decoration")
- **Don't use a purple-to-indigo gradient anywhere.** This color combination is the default "modern tech" signal and has no relationship to the amber, warm-brown palette of this system. (AI Slop: "Purple Gradient Default")
```

---

## Validation Checklist

Use this checklist to verify any DESIGN.md before accepting it as complete.

- [ ] Document title matches format `# Design System: [Name]` (name is descriptive, not generic)
- [ ] All 7 numbered sections are present, in order, with exact headings
- [ ] `## 1. Creative North Star` is present and is the first section
- [ ] `## 7. Do's and Don'ts` is present and is the last section
- [ ] `### North Star: "[Poetic Name]"` subsection present with name in double quotes
- [ ] Anti-Moodboard contains at least 2 named rejections with one-line rationales
- [ ] Core Prohibitions contains at least 2 numbered, mechanically-checkable rules stated as negatives
- [ ] Palette includes surface, primary, secondary, tertiary, on-surface, outline tokens
- [ ] Surface Hierarchy defines at least 4 named layers (base, section, component, interactive)
- [ ] Type Scale table includes all 9 required levels: `display-lg`, `headline-lg`, `title-lg`, `title-sm`, `body-lg`, `body-md`, `label-lg`, `label-md`, `label-sm`
- [ ] No font from the banned list appears in the Type Scale: Inter, Roboto, Open Sans, Lato, Arial
- [ ] Spacing Scale defines a base unit explicitly (e.g., "Base unit: 4px")
- [ ] Shadow Definitions are present — either named tokens with CSS values OR an explicit "no shadows" statement
- [ ] Buttons section defines primary, secondary, and tertiary variants with all required states
- [ ] Cards section contains an explicit statement about whether nesting is allowed and to what depth
- [ ] Do's and Don'ts — Don't section contains all Core Prohibitions restated in context
- [ ] Do's and Don'ts — Don't section contains at least 3 items referencing AI Slop checklist patterns
- [ ] No pure `#000000` or `#FFFFFF` in the palette
- [ ] No purple-to-indigo gradient defined anywhere in Colors or Components
- [ ] Specialized Components section is present, even if it states "None for this system"
