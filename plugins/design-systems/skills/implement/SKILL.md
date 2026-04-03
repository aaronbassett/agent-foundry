---
name: design-systems:implement
description: >
  Apply a DESIGN.md design system to the project's existing CSS/style files.
  Triggers on: "implement the design system", "apply design system",
  "set up design tokens", "apply DESIGN.md", or /design-systems:implement.
  Reads DESIGN.md, detects the project's CSS framework, and updates style
  files with design tokens.
---

# Implement Design System

Read DESIGN.md and apply its tokens to the project's existing style files.

## DESIGN.md Discovery

Find DESIGN.md using this search order:
1. Check CLAUDE.md in cwd for a reference to DESIGN.md
2. Look for DESIGN.md in cwd
3. Search upward from cwd
4. Search common locations: project root, `src/`, `packages/*/`
5. If not found, tell the user: "No DESIGN.md found. Run `/design-systems:create` first."

Use Glob to search: `**/DESIGN.md`

## Implementation Flow

### Step 1: Parse the Design System

Extract all implementable tokens from DESIGN.md:

- **Colors**: Every hex value with its token name from the Palette subsection
- **Typography**: Font families, sizes (rem), weights, line-heights from the Type Scale table
- **Spacing**: Base unit and all derived values from the Spacing Scale table
- **Shadows**: Exact CSS values from Shadow Definitions
- **Radius**: Border-radius values from the Components section
- **Any other CSS-expressible values** mentioned in the schema

### Step 2: Detect Framework/CSS Setup

Scan the project for the styling approach:

| Indicator | Framework | Token Format |
|-----------|-----------|-------------|
| `tailwind.config.*` present | Tailwind CSS | Extend theme in config file |
| `*.module.css` or `*.module.scss` files | CSS Modules | CSS custom properties in global stylesheet |
| `styled-components` or `@emotion` in package.json | CSS-in-JS | Theme object exported from a theme file |
| `*.css` or `*.scss` files present | Vanilla CSS/SCSS | CSS custom properties in a variables file |
| `*.vue` files with `<style>` blocks | Vue SFC | CSS custom properties in global stylesheet |
| `*.svelte` files with `<style>` blocks | Svelte | CSS custom properties in global stylesheet |
| None detected | Unknown | Ask user; default to CSS custom properties |

Use Glob to detect: `**/tailwind.config.*`, `**/*.module.css`,
`**/*.module.scss`, `**/*.vue`, `**/*.svelte`.
Use Grep to check package.json for styled-components or @emotion.

### Step 3: Apply Tokens

Based on the detected framework:

**CSS Custom Properties** (default for vanilla CSS, CSS Modules, Vue, Svelte):

Create or update a tokens file with all design tokens:

```css
:root {
  /* Colors — Surface */
  --surface: #value;
  --surface-dim: #value;
  --surface-bright: #value;
  --surface-container-lowest: #value;
  --surface-container-low: #value;
  --surface-container: #value;
  --surface-container-high: #value;
  --surface-container-highest: #value;

  /* Colors — Primary */
  --primary: #value;
  --primary-container: #value;
  --on-primary: #value;
  --on-primary-container: #value;

  /* Colors — Secondary */
  --secondary: #value;
  --secondary-container: #value;
  --on-secondary: #value;
  --on-secondary-container: #value;

  /* Colors — Tertiary */
  --tertiary: #value;
  --tertiary-container: #value;
  --on-tertiary: #value;
  --on-tertiary-container: #value;

  /* Colors — Outline */
  --outline: #value;
  --outline-variant: #value;

  /* Colors — On Surface */
  --on-surface: #value;
  --on-surface-variant: #value;

  /* Typography */
  --font-display: 'Font Name', fallback;
  --font-body: 'Font Name', fallback;
  --font-mono: 'Font Name', monospace;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  /* ... all spacing tokens ... */

  /* Shadows */
  --shadow-sm: /* value */;
  --shadow-md: /* value */;
  --shadow-lg: /* value */;

  /* Radius */
  --radius-sm: /* value */;
  --radius-md: /* value */;
  --radius-lg: /* value */;
}
```

Place the tokens file at:
- If a `variables.css`, `_variables.scss`, or similar exists: update it
- Otherwise: create `design-tokens.css` next to DESIGN.md

**Tailwind CSS**:

Extend the existing `tailwind.config.*` file's theme:

```js
// Add to theme.extend
colors: {
  surface: { DEFAULT: '#value', dim: '#value', bright: '#value', ... },
  primary: { DEFAULT: '#value', container: '#value' },
  // ... map all color tokens
},
fontFamily: {
  display: ['Font Name', 'fallback'],
  body: ['Font Name', 'fallback'],
  mono: ['Font Name', 'monospace'],
},
spacing: {
  // ... map spacing scale
},
boxShadow: {
  // ... map shadow tokens
},
borderRadius: {
  // ... map radius tokens
},
```

**CSS-in-JS** (styled-components, emotion):

Create or update a theme file:

```ts
export const theme = {
  colors: {
    surface: { default: '#value', dim: '#value', ... },
    primary: { default: '#value', container: '#value' },
    // ...
  },
  fonts: {
    display: "'Font Name', fallback",
    body: "'Font Name', fallback",
    mono: "'Font Name', monospace",
  },
  spacing: { ... },
  shadows: { ... },
  radii: { ... },
} as const;
```

### Step 4: Replace Hardcoded Values (Optional)

If existing CSS files contain hardcoded values that match DESIGN.md tokens,
offer to replace them with variable references. Show the user what will change:

```
Found 12 hardcoded values matching design tokens:
- src/styles/global.css:14 — #1a1a1a → var(--surface)
- src/styles/global.css:28 — #0052FF → var(--primary)
...
Replace these with token references? [y/n]
```

### Step 5: Report

Tell the user:
- Files created or modified (with paths)
- Number of tokens defined
- Any DESIGN.md values that couldn't be mapped
- Suggest: "Run `/design-systems:review` to verify your existing code matches the new tokens"

## In-Session Agent Guidance

After completing the implementation, follow these rules for the rest of
the session when writing any UI code:

- **Surface hierarchy**: Use DESIGN.md's layering rules to choose backgrounds
- **Typography**: Match content type to the type scale (headlines → display/headline, body → body-md, data → label with mono)
- **Spacing**: Derive all values from the spacing scale. Never invent new values.
- **Prohibitions**: Respect Core Prohibitions unconditionally
- **Edge cases**: Use the closest defined token. Do not introduce new values.
