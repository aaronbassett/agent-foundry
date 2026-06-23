# Batch jobs

Recipes for compressing or converting many images at once. **Safety first:**

- Always **dry-run or test on a copy** before a destructive batch.
- Prefer writing to a **separate output directory** (`-o` / `-d`) over in-place.
- When in-place is required, take a **backup** (`rimage -b`) or version control.
- Confirm the **count and scope** with the user before running (e.g. "this will
  process 412 files under ./public/img — proceed?").
- **Mind mislabeled extensions.** `find -iname '*.jpg'` selects by *name*, but the
  tools act on *content* — an AI-generated JPEG saved as `.png` is missed by the
  glob (or misrouted). For untrusted/AI-generated inputs, verify with
  `file --mime-type -b <file>` and correct extensions first (see the format note
  in SKILL.md).
- After the batch, **report total bytes saved**.

## Count first

Always know the blast radius before acting:
```bash
# How many JPEGs under a project?
find . -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) | wc -l
# Total bytes of PNGs
find . -type f -iname '*.png' -print0 | du -ch --files0-from=- 2>/dev/null | tail -1
```

## caesiumclt handles directories natively (preferred for JPEG/PNG/WebP)

caesiumclt is recursive and structure-preserving on its own — no `find` needed:

```bash
# Compress every JPEG/PNG under ./images at q82 into ./dist, mirroring the tree
caesiumclt -q 82 -R -S -o dist/ ./images

# Dry run first to see what would happen and the projected savings
caesiumclt -q 82 -R -S --dry-run -o dist/ ./images

# Resize-and-compress an entire photo library to max 2048px, no upscaling
caesiumclt -q 80 --long-edge 2048 --no-upscale -R -S -o web/ ./photos
```

## Lossless-compress all photos in a directory (in place, with care)

```bash
# JPEG + PNG, lossless, strongest PNG effort, suffixed copies (non-destructive)
caesiumclt --lossless --zopfli --png-opt-level 6 -R -S -o optimized/ ./images
```
For true in-place lossless (overwriting originals), only after the user confirms:
```bash
caesiumclt --lossless --png-opt-level 6 --same-folder-as-input --overwrite all -R ./images
```

## Find all JPEGs in a project and convert to WebP **and** AVIF

rimage encodes one format per run, so run it twice. Use `find ... -print0 | xargs -0`
to handle spaces in paths and process in parallel.

```bash
# WebP copies into ./out (rimage with -r preserves structure relative to inputs)
find ./src -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -print0 \
  | xargs -0 rimage webp -q 80 -d out/webp

# AVIF copies into ./out
find ./src -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -print0 \
  | xargs -0 rimage avif -q 55 --speed 4 -d out/avif
```

> Note on structure: `rimage -r` preserves folder structure when used with `-d`.
> If you need an exact mirror, pass files relative to a base dir, or post-process
> the output layout. For simple flat output, omit `-r`.

## Convert PNGs to WebP in bulk (fast path with caesiumclt)

```bash
caesiumclt -q 80 --format webp -R -S -o webp/ ./png-assets
```

## Build a responsive set for many source images

For each source image, emit several widths in each modern format. Wrap the
single-image loop from `web-optimization.md` in a `find`:

```bash
OUT=responsive
find ./src -type f \( -iname '*.jpg' -o -iname '*.png' \) -print0 |
while IFS= read -r -d '' f; do
  base="$(basename "${f%.*}")"
  for w in 480 768 1024 1600 2400; do
    rimage webp -q 80 --resize "${w}w" --no-upscale -d "$OUT" -s "-${base}-${w}" "$f"
    rimage avif -q 55 --resize "${w}w" --no-upscale -d "$OUT" -s "-${base}-${w}" "$f"
  done
done
```
(Adjust naming to match the `srcset` your markup expects.)

## Optimize every GIF under a directory

```bash
find . -type f -iname '*.gif' -print0 |
  xargs -0 -I{} gifsicle -O3 --lossy=40 --colors 128 -b {}
```
`-b` edits each in place. Drop `-b` and redirect per-file if you want copies.
Remind the user that converting GIFs to WebP/AVIF/video saves far more (see
`gifsicle.md`).

## Hit a size budget across a folder

```bash
# Make every image at most 300KB, into out/
caesiumclt --max-size 300KB -R -S -o out/ ./images
```

## Report savings

After any batch, summarize before/after. `caesiumclt --json` emits per-file
sizes; or compare directory sizes:
```bash
echo "before: $(du -sh ./images | cut -f1)"
echo "after:  $(du -sh ./dist   | cut -f1)"
```

## Patterns worth offering the user
- **Convert-in-repo audit:** find all raster images, report counts/sizes by
  format, and propose a conversion plan before touching anything.
- **CI/pre-commit hook:** losslessly optimize newly added images. (Mention as an
  option; implement only if asked.)
- **Keep-smaller policy:** use `--overwrite bigger` (caesiumclt) so a file is
  only replaced when the result is actually smaller.
