---
name: design-systems:specimen
description: >
  Generate a self-contained HTML specimen page that renders the design
  system live. Triggers on: "generate specimen", "preview design system",
  "show design system", "specimen page", "visualize design system",
  or /design-systems:specimen.
  Produces a single HTML file with all tokens rendered as visual examples.
---

# Design System Specimen

Generate a self-contained HTML page that renders the design system live.

## DESIGN.md Discovery

Find DESIGN.md using this search order:
1. Check CLAUDE.md in cwd for a reference to DESIGN.md
2. Look for DESIGN.md in cwd
3. Search upward from cwd
4. Search common locations: project root, `src/`, `packages/*/`
5. If not found, tell the user: "No DESIGN.md found. Run `/design-systems:create` first."

## Generation Flow

### Step 1: Parse DESIGN.md

Extract everything needed to render the specimen:

- **System name** from the title
- **Creative North Star** name and first paragraph
- **Full color palette** with token names and hex values
- **Surface hierarchy** layering rules
- **Type scale** with font families, sizes, weights
- **Spacing scale** with all token values
- **Shadow definitions** with exact CSS values
- **Component specs** for buttons, cards, inputs
- **Core Prohibitions** for the "What NOT to do" section

### Step 2: Generate HTML

Produce a single HTML file. Requirements:
- **Self-contained**: All CSS inline in a `<style>` block. No external CSS files.
- **Fonts**: Load from Google Fonts CDN via `<link>` tags. These are the ONLY external dependencies.
- **Minimal JS**: Only for interactive state demonstrations (hover simulation on touch devices, focus state toggling). No frameworks, no build step.
- **Semantic HTML**: Use `<header>`, `<main>`, `<section>`, `<article>`, `<button>`, etc.
- **Accessible**: Include `aria-label` on sections, proper heading hierarchy.

**Page structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System Specimen: [Name]</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=[fonts]&display=swap" rel="stylesheet">
  <style>
    :root {
      /* ALL design tokens as CSS custom properties */
      /* Copy every token from DESIGN.md */
    }
    /* Page layout */
    /* Section styles */
    /* Component demonstrations */
  </style>
</head>
<body style="background: var(--surface); color: var(--on-surface); font-family: var(--font-body);">

  <header>
    <h1 style="font-family: var(--font-display);">Design System Specimen</h1>
    <p>[Creative North Star name]: [First paragraph of north star description]</p>
  </header>

  <main>
    <section id="palette" aria-label="Color Palette">
      <h2>Colors</h2>
      <!-- For each color token: a swatch div showing the color,
           with the token name and hex value as labels -->
      <!-- Group by: Surface tokens, Primary, Secondary, Tertiary,
           Outline, On-Surface -->
      <!-- Surface Hierarchy: nested boxes showing base → section →
           component → interactive layering -->
    </section>

    <section id="typography" aria-label="Typography">
      <h2>Typography</h2>
      <!-- For each type scale level: render sample text at the
           actual size, weight, and font family -->
      <!-- Show: level name, token, font family, size, weight -->
      <!-- Include a paragraph demonstrating body text at body-md -->
      <!-- Include a data sample demonstrating mono/label text -->
    </section>

    <section id="spacing" aria-label="Spacing Scale">
      <h2>Spacing</h2>
      <!-- Visual ruler: horizontal bars at each spacing value -->
      <!-- Label each bar with: token name, rem value, px value -->
    </section>

    <section id="elevation" aria-label="Elevation & Depth">
      <h2>Elevation</h2>
      <!-- Cards at different elevation levels using the shadow tokens -->
      <!-- If no shadows: demonstrate tonal layering with nested surfaces -->
      <!-- Show the surface hierarchy nesting in practice -->
    </section>

    <section id="components" aria-label="Components">
      <h2>Components</h2>

      <article>
        <h3>Buttons</h3>
        <!-- Primary, Secondary, Tertiary buttons -->
        <!-- Each in default, hover (simulated with class), focus,
             disabled states -->
      </article>

      <article>
        <h3>Cards</h3>
        <!-- A sample card with the system's surface, radius,
             shadow, spacing treatment -->
        <!-- If hover behavior is defined, include a
             :hover demonstration -->
      </article>

      <article>
        <h3>Input Fields</h3>
        <!-- Default state input -->
        <!-- Focused state input (simulated with class) -->
        <!-- With label in the specified treatment -->
      </article>

      <article>
        <h3>Specialized Components</h3>
        <!-- Any specialized components from DESIGN.md Section 6 -->
        <!-- Or "None defined for this system" -->
      </article>
    </section>

    <section id="prohibitions" aria-label="What NOT To Do">
      <h2>Prohibitions</h2>
      <!-- For each Core Prohibition: show a visual example of
           the VIOLATION with a red overlay/border/indicator -->
      <!-- Label each: "PROHIBITED: [prohibition text]" -->
      <!-- This makes violations viscerally recognizable -->
    </section>
  </main>

  <script>
    // Minimal JS for interactive demonstrations
    // Toggle .hover class on buttons/cards for touch devices
    // Toggle .focus class on inputs
    document.querySelectorAll('[data-interactive]').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('demo-active');
      });
    });
  </script>
</body>
</html>
```

### Step 3: Output

**Default (disposable preview):**
1. Write the HTML to a temp file: `/tmp/design-specimen-[name-slug].html`
2. Open in browser: `open /tmp/design-specimen-[name-slug].html` (macOS)
3. Tell the user where the file is

**If user requests save:**
1. Ask where to save (suggest next to DESIGN.md)
2. Write to the chosen path
3. Tell the user the file was saved

Report what was generated:
- Path to the specimen file
- Number of color tokens rendered
- Number of type scale levels rendered
- Number of components demonstrated
- Number of prohibitions visualized
