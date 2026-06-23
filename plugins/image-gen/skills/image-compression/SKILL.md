---
name: image-compression
description: >-
  This skill should be used when the user asks to "compress an image",
  "optimize images", "reduce image file size", "make images smaller",
  "convert to WebP", "convert to AVIF", "optimize images for the web",
  "create a srcset", "responsive images", "compress a GIF", "shrink a GIF",
  "batch compress a folder", "losslessly compress images", or wants to compare
  compression levels and preview before/after results. Uses caesiumclt, rimage,
  and gifsicle. Triggers include: "compress", "optimize image", "WebP", "AVIF",
  "srcset", "lossless", "reduce file size", "image too big", "gifsicle".
version: 0.1.0
---

# Image Compression

Compress, resize, and convert images using three CLI tools — **caesiumclt**
(fast batch JPEG/PNG/WebP), **rimage** (codec-quality encoding + AVIF), and
**gifsicle** (GIF/animation) — and show the user an interactive before/after
preview in their browser so they can choose a compression level.

All commands run via the Bash tool. Scripts and references live in this skill's
directory (paths below are relative to it).

## Always check tools first

These tools are **not** guaranteed to be installed. Before using any of them,
verify availability — never assume, never silently substitute:

```bash
scripts/check-tools.sh
```

This reports each tool's `--version` and prints OS-correct install commands for
any that are missing (exit code 1 if any are absent). If a tool is missing, show
the user the exact install command for their OS and ask them to install it before
proceeding. See **`references/tool-selection.md`** for the full install matrix
(Homebrew / cargo / winget / apt / dnf / pacman / prebuilt binaries).

## Picking the right tool

| Need | Tool |
|------|------|
| Batch-compress a folder of JPEG/PNG/WebP, resize, hit a size budget | **caesiumclt** |
| Best quality per byte, convert to **AVIF**, MozJPEG/OxiPNG/WebP encoding | **rimage** |
| Optimize / shrink / resize an animated or static **GIF** | **gifsicle** |

Rule of thumb: caesiumclt for *throughput*, rimage for *quality and AVIF*,
gifsicle for *anything GIF*. Full decision matrix in
**`references/tool-selection.md`**. Per-tool flags, options, and recipes are in
**`references/caesiumclt.md`**, **`references/rimage.md`**, and
**`references/gifsicle.md`** — consult the relevant one before constructing a
command, since flags differ by tool and version.

## Core workflow

1. **Understand the goal**: web delivery, archival/lossless, a size budget,
   format conversion, or a one-off shrink? Web delivery has its own best
   practices (resize → modern format → compress → responsive markup).
2. **Check tools** (`scripts/check-tools.sh`); prompt to install if needed.
3. **Compress** with the right tool. For anything important or batched, do a
   small test first rather than trusting a quality number blindly.
4. **Preview** the result for the user (see below) and let them confirm the
   quality/level — especially before a large batch or a destructive in-place run.
5. **Apply** at scale and **report bytes saved**.

**Verify the real format when the extension is untrustworthy.** These tools detect
format from a file's *content* (magic bytes), not its name. AI image generators
(including nanobanana) sometimes save bytes under a mismatched extension — e.g. a
JPEG named `.png`. A mislabeled file can break format conversion (caesiumclt
reports `Cannot convert to the same format`) and be missed by extension-based
batch globs (`find -iname '*.png'`). When inputs are AI-generated or otherwise
untrusted, check the true type and rename to match before processing:

```bash
file --mime-type -b suspect.png        # e.g. prints "image/jpeg"
# rename if it mismatches, e.g.: mv suspect.png suspect.jpg
```

(The nanobanana skill bundles `scripts/fix-image-extension.sh` to do this
automatically on generated files.)

## Quick recipes

```bash
# Compress one JPEG at q80 into out/
caesiumclt -q 80 -o out/ photo.jpg

# Best-quality WebP and AVIF from a source, resized to 1600px wide
rimage webp -q 80 --resize 1600w -d out/ hero.png
rimage avif -q 55 --resize 1600w -d out/ hero.png

# Lossless PNG crush (strongest)
caesiumclt --lossless --zopfli --png-opt-level 6 -o out/ logo.png

# Optimize an animated GIF (optimize + lossy + color reduction)
gifsicle -O3 --lossy=40 --colors 128 anim.gif -o anim-small.gif

# Compress a whole tree, mirroring structure, into dist/
caesiumclt -q 82 -R -S -o dist/ ./images
```

## Web optimization

For images destined for a website, do more than compress: resize to the largest
displayed size, convert to AVIF + WebP (with a JPEG fallback), and serve
responsively with `srcset` / `<picture>`. Defaults: photos at **WebP q80** /
**AVIF q55**, resized to the layout's max width.

**`references/web-optimization.md`** covers the format decision tree, quality
targets, generating responsive resolution sets, and complete `srcset` /
`<picture>` markup examples. Read it whenever the destination is the web.

## Modernizing GIFs

gifsicle only shrinks GIFs ~10–30%. Replacing a GIF with a muted **video**
(WebM + MP4) or an **animated WebP** is usually **50–90% smaller**. These use two
optional tools (check for them, prompt to install if absent): `ffmpeg` for video,
and `gif2webp` (from the `webp` package) for animated WebP.

```bash
# GIF -> MP4 (universal) + WebM (smaller); embed in <video autoplay muted loop playsinline>
ffmpeg -i in.gif -an -movflags +faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -crf 23 in.mp4
ffmpeg -i in.gif -an -c:v libvpx-vp9 -b:v 0 -crf 34 -pix_fmt yuv420p -row-mt 1 in.webm

# GIF -> animated WebP (single-file <img> drop-in)
gif2webp -lossy -q 60 -m 6 in.gif -o in.webp     # drop -lossy for flat/UI GIFs
```

Caveat: ffmpeg's AVIF muxer writes a **still** image (no animated AVIF) —
use AV1-in-WebM video instead. Video is the most reliable and smallest path;
animated WebP is the option when the markup must stay an `<img>`. Full workflow —
`<video>` embed details (autoplay, controls, poster, reduced-motion), pros/cons,
and a decision guide — in **`references/gif-modernization.md`**. Keep GIFs as GIFs
only when the destination requires it (email, chat, some markdown).

## Batch jobs

Common patterns — losslessly compress every photo in a directory, find all JPEGs
in a project and convert them to WebP + AVIF, build a responsive set across many
sources, optimize every GIF, or hit a size budget folder-wide — are in
**`references/batch-jobs.md`**, with safety guidance (count first, dry-run,
output to a separate dir, back up before in-place, report savings). Confirm scope
with the user before running a destructive batch.

## Visual before/after preview

Show the user a comparison in their browser to judge quality and pick a level.
Two scripts plus a self-contained HTML template (`assets/compare-template.html`)
do this. Full details in **`references/preview.md`**.

```bash
# 1. Build the page from an original + one or more compressed variants
python3 scripts/build_preview.py \
  --original photo.png \
  --variant out/photo.webp --label "WebP q80" \
  --variant out/photo.avif --label "AVIF q55" \
  --out-dir /tmp/preview --title "photo.png — pick a level"

# 2. Serve it and give the user the printed URL
scripts/start-preview.sh --dir /tmp/preview --open

# 3. Stop when done (state-dir is printed by start-preview.sh)
scripts/stop-preview.sh "<state-dir>"
```

- **One `--variant`** → a single original-vs-compressed comparison.
- **Several `--variant`s** → a chooser with a per-variant size/savings table, so
  the user can select the smallest acceptable level/format.

The preview offers four switchable comparison views — side-by-side,
press-and-hold, alpha slider, and before/after slider (with a vertical/horizontal
orientation toggle). See **`references/preview.md`** for what each does.

`start-preview.sh` binds to `127.0.0.1` on a free port, auto-shuts down after an
idle timeout, and prints a `server-started` JSON line with the URL to relay.
Requires `python3` (stdlib only).

## Additional resources

### Reference files
- **`references/tool-selection.md`** — which tool when; install commands per OS.
- **`references/caesiumclt.md`** — caesiumclt flags & recipes (batch JPEG/PNG/WebP).
- **`references/rimage.md`** — rimage codecs & recipes (MozJPEG/OxiPNG/WebP/AVIF).
- **`references/gifsicle.md`** — gifsicle GIF optimization & recipes.
- **`references/gif-modernization.md`** — GIF → video / animated WebP via ffmpeg (optional tool), with `<video>` embed guidance and pros/cons.
- **`references/web-optimization.md`** — web best practices, formats, srcset/picture.
- **`references/batch-jobs.md`** — directory-wide and project-wide recipes.
- **`references/preview.md`** — full preview build/serve/stop workflow.

### Scripts
- **`scripts/check-tools.sh`** — verify tool availability + install hints.
- **`scripts/build_preview.py`** — generate the comparison HTML page.
- **`scripts/start-preview.sh`** / **`scripts/stop-preview.sh`** — serve/stop the preview.
- **`scripts/preview_server.py`** — the static server (invoked by start-preview.sh).
