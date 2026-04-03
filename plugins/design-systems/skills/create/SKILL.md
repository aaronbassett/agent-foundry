---
name: design-systems:create
description: >
  Create an opinionated design system as a DESIGN.md file. Triggers on:
  "create a design system", "generate DESIGN.md", "design system for [description]",
  "new design system", "design system", or /design-systems:create.
  Generates a complete DESIGN.md with Creative North Star, Core Prohibitions,
  Anti-Moodboard, and full token definitions. Actively avoids AI slop patterns.
---

# Create Design System

Generate a complete, opinionated DESIGN.md from a short description.

## Input

The user provides a short description of the desired aesthetic direction.
Examples:
- "dark editorial for a privacy-focused developer tool"
- "warm minimal for a recipe app"
- "brutalist for a crypto exchange"

If no description is provided, ask for one:

```
question: "Describe the design direction in a few words"
options:
  - label: "Dark editorial"
    description: "Moody, magazine-inspired, serif-forward"
  - label: "Clean minimal"
    description: "Extreme reduction, one accent color, invisible UI"
  - label: "Bold brutalist"
    description: "Hard edges, high contrast, raw structure"
  - label: "Warm organic"
    description: "Natural textures, warm palette, flowing forms"
```

## Generation Flow

### Step 1: Load References

Read these files before generating anything:
- `${CLAUDE_SKILL_DIR}/references/anti-slop.md` — patterns to avoid
- `${CLAUDE_SKILL_DIR}/references/aesthetic-seeds.md` — non-default starting directions
- `${CLAUDE_SKILL_DIR}/references/design-md-schema.md` — strict output schema

### Step 2: Select Aesthetic Seed

Based on the user's description, select the most appropriate seed from
`aesthetic-seeds.md`. The seed provides:
- Font pairing candidates (display + body + mono)
- Color derivation strategy
- Spatial philosophy
- Elevation approach
- Natural prohibitions

The seed is a **starting direction**, not a template. Adapt and build
on it based on the user's specific needs. Combine elements from
multiple seeds if the description warrants it.

### Step 3: Generate DESIGN.md

Follow the strict schema from `design-md-schema.md` exactly. Generate
all 7 sections with all required subsections.

**Anti-Slop Enforcement — CRITICAL:**

For EVERY design decision, cross-check against `anti-slop.md`. This
is not optional. The following checks are mandatory:

| Section | Anti-Slop Checks |
|---------|-----------------|
| Typography | No Inter, Roboto, Open Sans, Lato, Arial as primary. Weight contrast must be extreme (not 400 vs 600). Size jumps 3x+ between levels. |
| Colors | No purple/indigo gradient defaults. No pure #000000 or #ffffff. Palette has one dominant + sharp accent, not evenly distributed. No cyan-on-dark neon default. |
| Layout | Prohibitions must ban at least one layout anti-pattern. No uniform spacing throughout. |
| Shadows | No `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`. All shadows hue-tinted or otherwise distinctive. |
| Components | No `border-radius: 8-12px` + generic shadow combo. No left-border accent on all cards. Button hierarchy (primary/secondary/tertiary) must be visually distinct. |
| Do's/Don'ts | Must include relevant AI Slop checklist items as Don'ts. |

If a generated value matches a flagged anti-slop pattern, choose an
alternative. Do not proceed with slop values.

### Step 4: Auto-Detect Placement

Scan the project to determine where DESIGN.md should live:

1. Look for framework indicators:
   - `src/components/`, `src/app/`, `src/pages/` → project root
   - `app/` (Next.js app router) → project root
   - `packages/ui/`, `packages/web/`, `packages/frontend/` → that package root
2. In a monorepo, find the topmost directory containing all UI packages
3. Fall back to project root
4. Present the proposed path to the user, allow override

Use Glob to scan: `**/src/components`, `**/src/app`, `**/packages/*/src`,
`**/app`, `**/pages`.

### Step 5: Write DESIGN.md

Write the generated content to the detected/chosen path.

### Step 6: Update CLAUDE.md

At the same directory level as DESIGN.md, add to (or create) a CLAUDE.md:

```markdown
## Design System
Read and follow DESIGN.md for all UI work.
Never violate the Core Prohibitions defined in DESIGN.md.
Check the Anti-Moodboard before proposing any visual direction.
```

If a CLAUDE.md already exists, append this block. If it doesn't exist,
create it with this content.

### Step 7: Report

Tell the user:
- Where DESIGN.md was written
- The Creative North Star name
- How many Core Prohibitions were defined
- That CLAUDE.md was updated
- Suggest running `/design-systems:specimen` to preview the system

## Post-Generation Validation

After writing, run the validation checklist from `design-md-schema.md`:
- Verify all 7 sections present
- Verify no banned fonts in type scale
- Verify no anti-slop patterns in palette
- Verify Core Prohibitions are mechanically checkable
- Verify Anti-Moodboard has at least 2 rejections

If any check fails, fix the issue before presenting to the user.
