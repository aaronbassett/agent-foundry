---
name: design-systems:review
description: >
  Audit UI code for design system compliance and AI slop markers.
  Triggers on: "review design system", "check design compliance",
  "audit UI code", "design system review", "check for AI slop",
  "design review", or /design-systems:review.
  Scans CSS, SCSS, JSX, TSX, Vue, and Svelte files against DESIGN.md
  rules and the AI Slop Instant Giveaways checklist.
---

# Review Design System Compliance

Scan the project's UI code and produce a compliance report covering
design system adherence and AI slop detection.

## DESIGN.md Discovery

Find DESIGN.md using this search order:
1. Check CLAUDE.md in cwd for a reference to DESIGN.md
2. Look for DESIGN.md in cwd
3. Search upward from cwd
4. Search common locations: project root, `src/`, `packages/*/`
5. If not found, tell the user: "No DESIGN.md found. Run `/design-systems:create` first."

## Input

Optional argument: path to specific files or directory to review.
Default: scan all UI code in the project.

## Review Flow

### Step 1: Parse Enforceable Rules

Extract from DESIGN.md:

| Source | What to Extract | Use |
|--------|----------------|-----|
| Palette (Section 2) | All hex values with token names | Detect hardcoded colors outside the set |
| Type Scale (Section 3) | Font families, weights | Detect unauthorized fonts/weights |
| Spacing Scale (Section 4) | All spacing values | Detect off-scale spacing |
| Shadow Definitions (Section 5) | Exact CSS shadow values | Detect non-token shadows |
| Components (Section 6) | Border-radius values | Detect non-token radii |
| Core Prohibitions (Section 1) | Each prohibition as a rule | Custom check per prohibition |

### Step 2: Determine Scan Scope

Target file types: `*.css`, `*.scss`, `*.jsx`, `*.tsx`, `*.vue`, `*.svelte`

Exclude patterns:
- `node_modules/**`
- `dist/**`, `build/**`, `.next/**`, `out/**`
- `vendor/**`
- `*.min.css`, `*.min.js`

Use Glob to find files: `**/*.{css,scss,jsx,tsx,vue,svelte}`

If the user provided a specific path, scope to that path only.

### Step 3: Design System Compliance Audit

For each DESIGN.md section, scan the codebase:

**Colors (Section 2):**
- Grep for hex patterns: `#[0-9a-fA-F]{3,8}`
- Also grep for `rgb(`, `rgba(`, `hsl(`, `hsla(` color declarations
- Cross-reference each found value against the DESIGN.md palette
- Flag any color not in the token set
- Severity: CRITICAL if the color is explicitly banned (e.g., pure #000000 when prohibited), MODERATE otherwise

**Typography (Section 3):**
- Grep for `font-family` declarations in CSS/SCSS
- Grep for `fontFamily` in JSX/TSX (inline styles, styled-components)
- Cross-reference against the DESIGN.md type scale font families
- Flag any font not in the allowed list
- Also grep for `font-weight` values and check against allowed weights
- Severity: CRITICAL if a banned font (Inter, Roboto, etc.), MODERATE if just off-system

**Spacing (Section 4):**
- Grep for `margin`, `padding`, `gap` with explicit values (not `auto` or `0`)
- Cross-reference values against the DESIGN.md spacing scale
- Flag values not derivable from the scale
- Severity: MODERATE (spacing drift is common and usually non-critical)

**Shadows (Section 5):**
- Grep for `box-shadow` declarations
- Compare each found shadow against the DESIGN.md shadow tokens
- Flag non-matching shadows
- Severity: MODERATE, unless it matches the generic AI shadow (`0 4px 6px rgba(0,0,0,0.1)`) which is CRITICAL

**Radius (Section 6):**
- Grep for `border-radius` values
- Cross-reference against DESIGN.md-defined radius tokens
- Flag non-token values
- Severity: MINOR

**Core Prohibitions (Section 1):**
- For each prohibition, construct a check:
  - "No 1px borders" → Grep for `border.*1px solid` or `border-width: 1px`
  - "No centered body text" → Grep for `text-align: center` in body contexts
  - "No pure #000000" → Grep for `#000000` or `#000` exact matches
  - Other prohibitions: use judgment to construct appropriate grep patterns
- Flag every match
- Severity: CRITICAL (prohibitions are absolute)

### Step 4: AI Slop Detection

Independent of DESIGN.md, check for Instant Giveaways. Read the full
checklist from `${CLAUDE_PLUGIN_ROOT}/skills/create/references/anti-slop.md`.

Key patterns to grep for:

| Pattern | Grep Target | Severity |
|---------|------------|----------|
| Purple/indigo gradients | `#667eea`, `#764ba2`, `bg-indigo`, `from-indigo`, `to-purple` | WARNING |
| Banned default fonts | `font-family.*Inter[^-]`, `font-family.*Roboto`, `font-family.*"Open Sans"`, `font-family.*Lato`, `font-family.*Arial` | WARNING |
| Gradient text | `-webkit-background-clip: text`, `background-clip: text` | WARNING |
| Generic shadow | `box-shadow.*0.*4px.*6px.*rgba\(0.*0.*0.*0\.1\)` | WARNING |
| Glassmorphism combo | `backdrop-filter.*blur` near `rgba` background near `rgba` border | WARNING |
| Generic card shadow combo | `border-radius.*8px` or `border-radius.*12px` near `box-shadow.*rgba\(0.*0.*0.*0\.1\)` | WARNING |
| Left border accent | `border-left.*4px solid var\(--` | WARNING |

Note: "Three-column icon grid" and "nested cards" are structural patterns
that can't be reliably grep-detected. Use judgment when reading JSX/TSX
components — flag if you notice these patterns during the scan.

### Step 5: Generate Report

Output this report format to the terminal:

```
## Design System Review: [Project/Directory Name]

### Summary
- Compliance: X/7 sections passing
- Violations: N found (C critical, M moderate, I minor)
- AI Slop Markers: N detected

### Section Results

#### Colors [PASS/FAIL]
[List violations or "No violations found."]

#### Typography [PASS/FAIL]
[List violations or "No violations found."]

#### Spacing [PASS/FAIL]
[List violations or "No violations found."]

#### Shadows [PASS/FAIL]
[List violations or "No violations found."]

#### Radius [PASS/FAIL]
[List violations or "No violations found."]

#### Components [PASS/FAIL]
[List violations or "No violations found."]

#### Prohibitions [PASS/FAIL]
[List violations or "No violations found."]

### AI Slop Detection
[List warnings or "No AI slop markers detected."]

### Prohibition Violations
[List critical violations or "All Core Prohibitions respected."]

### Drift Analysis
[If multiple violations cluster in one area, note the pattern.
Example: "Shadow values are the main area of non-compliance — 
6 of 8 violations are shadow-related. Consider updating shadow
tokens or refactoring these components."]
```

**Violation format:**
```
- [SEVERITY] path/to/file.ext:LINE — Description of violation
```

**Severity levels:**
- **CRITICAL**: Violates a Core Prohibition or uses a banned anti-slop pattern
- **MODERATE**: Uses a value outside the token set but not explicitly prohibited
- **MINOR**: Style inconsistency (e.g., hardcoded value matching a defined token)
- **WARNING**: AI slop marker detected (not a design system violation per se)

A section PASSES if it has zero CRITICAL and zero MODERATE violations.
MINOR violations alone do not cause a section to fail.

## Context

This is the review/audit skill of the design-systems plugin. It checks code against DESIGN.md AND the AI slop reference. The anti-slop reference is at `${CLAUDE_PLUGIN_ROOT}/skills/create/references/anti-slop.md`.
