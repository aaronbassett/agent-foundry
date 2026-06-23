# Visual preview workflow

Show the user a before/after comparison in their browser so they can judge
quality and pick a compression level. Two scripts do the work:

1. `scripts/build_preview.py` — renders a self-contained HTML page from an
   original image plus one or more compressed variants.
2. `scripts/start-preview.sh` / `scripts/stop-preview.sh` — serve that page on a
   local loopback port and shut it down again.

The HTML template is `assets/compare-template.html`. It is fully self-contained
(inline CSS + vanilla JS, no network/CDN) and reads its data from an injected
JSON block.

## When to use which mode

- **Single comparison** (original vs one compressed image): pass exactly one
  `--variant`. The page shows the four comparison views for that pair.
- **Multi-variant chooser** (let the user pick a level/format): pass several
  `--variant`s (e.g. WebP q90 / q80 / q70, AVIF q55). The page adds a variant
  picker, a full comparison table (size + savings per variant), and applies the
  four views to whichever variant is selected.

## Step 1 — produce the compressed variant(s)

Compress with the appropriate tool (see the per-tool references). Example,
three candidate levels/formats of one source:
```bash
caesiumclt -q 80 --format jpeg -o /tmp/c photo.png         # /tmp/c/photo.jpg
rimage webp -q 80 -d /tmp/c -s -w80 photo.png              # photo@-w80.webp
rimage avif -q 55 -d /tmp/c -s -a55 photo.png              # photo@-a55.avif
```

## Step 2 — build the preview page

```bash
python3 scripts/build_preview.py \
  --original photo.png \
  --variant /tmp/c/photo.jpg          --label "JPEG q80" \
  --variant /tmp/c/photo@-w80.webp    --label "WebP q80" \
  --variant /tmp/c/photo@-a55.avif    --label "AVIF q55" \
  --out-dir /tmp/preview \
  --title "photo.png — pick a compression"
```
- `--variant` is repeatable. `--label` aligns with `--variant` by order; omit to
  auto-label from the filename.
- Images are copied into `<out-dir>/images/`, so the preview directory is
  portable and self-contained.
- The script prints each variant's size and savings %, and the exact
  `start-preview.sh` command to run.

For a **single** comparison, pass just one `--variant`.

## Step 3 — serve it and give the user the URL

```bash
scripts/start-preview.sh --dir /tmp/preview --open
```
- Prints a JSON line: `{"type":"server-started","url":"http://127.0.0.1:PORT/",...}`.
  Relay the `url` to the user.
- `--open` opens the default browser (omit in headless contexts).
- Binds to `127.0.0.1` on an OS-chosen free port. Writes a PID/info file into a
  state directory (printed on stderr as `state-dir: ...`).
- Auto-shuts down after an idle timeout (default 240 min; `--idle-timeout-minutes`).

Optional flags: `--host 0.0.0.0` (expose on the network), `--state-dir <dir>`
(choose where PID/log live), `--idle-timeout-minutes N`.

## Step 4 — stop the server

```bash
scripts/stop-preview.sh "<state-dir>"
```
Reads the PID file, terminates the server (SIGTERM then SIGKILL), and removes the
state dir if it's under a temp location. Safe to call if already stopped.

## The four comparison views

The page header has a segmented control to switch views; all operate on the
original vs the currently-selected variant:

1. **Side-by-side** — original and compressed shown next to each other, each with
   its size caption.
2. **Press & hold** — the compressed image is shown alone; pressing (mouse/touch)
   on it reveals the original in place, releasing returns to compressed. Best for
   spotting subtle artifacts.
3. **Alpha slider** — compressed layered over the original; a 0–100% slider fades
   the compressed image's opacity so differences "ghost" in and out.
4. **Before / After slider** — a draggable divider wipes between original
   ("Before") and compressed ("After"). A **Vertical / Horizontal** toggle
   switches the divider orientation (drag left-right vs up-down).

When multiple variants are supplied, the variant tabs and the bottom table both
switch the active comparison; the table's **Compare** buttons do the same.

## Persisting previews in a project

By default previews go to a temp dir. To keep one with a project (e.g. for a PR),
pass a project-relative `--out-dir` to `build_preview.py` and a matching
`--state-dir`. `stop-preview.sh` only deletes temp state dirs, never
project-relative ones. Avoid committing large preview image copies — treat the
preview dir as disposable unless the user wants it kept.

## Notes
- Requires `python3` (stdlib only — no pip installs).
- Both single and multi previews use the same template; "single" is just the
  one-variant case.
- The page reads image dimensions client-side, so resized variants correctly
  report their own dimensions in the stats bar.
