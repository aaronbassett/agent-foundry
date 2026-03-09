# Lexisim

Design writing voices from scratch or by emulating references, then generate a writer skill and full writing assistant subagent.

## How It Works

Most "write in X style" instructions are shallow — telling an AI "write casually but professionally" collapses dozens of independent style dimensions into a vague adjective. Lexisim goes deeper by guiding you through a structured questionnaire that captures voice across multiple independent axes, then generates a precise, reusable voice profile.

Where [Voiceprint](https://github.com/jamesckemp/claude-plugins/tree/master/voiceprint) captures how you *already* write, Lexisim helps you build how you *want* to write — like a character creator for prose.

The process takes ~20-25 minutes:

1. **Entry path** — Design from scratch or emulate a reference
2. **Audience persona** (~3 min) — Who's reading, what they know, what frustrates them
3. **Reading level calibration** (~4 min) — Show-don't-tell example pairs across four axes: vocabulary complexity, syntactic complexity, conceptual density, scaffolding level
4. **Voice character** (~4 min) — Emotional temperature, pacing, sentence rhythm, transitions, opening style
5. **Anti-voice definition** (~3 min) — What this voice explicitly is NOT, expanded to concrete forbidden patterns
6. **Uncanny valley detection** (~3 min) — Test paragraphs in the designed voice, flag what feels off
7. **Analysis & generation** (~1 min) — Sub-agent analyzes all data and generates output files

## Output

Two files generated at your chosen scope (project or user level):

- **`{name}-writer/SKILL.md`** — Complete voice profile with audience model, reading level axes, voice exemplars, forbidden patterns, and calibration notes
- **`{name}-writer.md`** — Full writing assistant agent that can draft, revise, critique, and adapt content in the designed voice

## Usage

### Design a new writing style

```
/lexisim:generate
```

Runs the full guided workflow. You'll choose between designing from scratch or emulating a reference, then walk through the questionnaire.

### Using the generated writer

Once generated, the writing assistant is available as a subagent. It can:

- **Draft** new content from a brief or topic
- **Revise** existing content to match the voice profile
- **Critique** content against the style profile and identify deviations
- **Adapt** content written in one voice to this voice

## Two Entry Paths

### Design from scratch

Build a voice through guided choices. The questionnaire probes for implicit influences ("anything you've read that felt close?") but doesn't require reference material.

### Emulate a reference

Paste 1-3 excerpts of writing you admire, describe what you like about them, and optionally blend elements from multiple influences. Lexisim analyzes the samples and uses them as a baseline that the questionnaire refines.

Both paths converge into the same deep questionnaire.

## What Makes This Different

Most voice tools capture a single dimension. Lexisim captures voice across independent axes:

- **Vocabulary, syntax, conceptual density, scaffolding** — four separate reading level dimensions, not one "reading level" dropdown
- **Emotional temperature** — warmth/coolness calibrated through precise questioning
- **Information pacing** — inverted pyramid, narrative build, tutorial rhythm, or conversational meander
- **Anti-voice** — what the voice is NOT, expanded from archetype rejections to concrete forbidden patterns
- **Audience awareness** — who's reading shapes how you write

## Scope Selection

During setup, you choose where the generated files are created:

- **Project scope** — created in `.claude/skills/` and `.claude/agents/` — available only in the current project
- **User scope** — created in `~/.claude/skills/` and `~/.claude/agents/` — available across all projects

## Based On

Extends concepts from [Voiceprint](https://github.com/jamesckemp/claude-plugins/tree/master/voiceprint) by James Kemp — adapting its stylometric analysis framework and AI tells catalog for voice *design* rather than voice *capture*.
