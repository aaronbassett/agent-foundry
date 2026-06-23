# Modernizing GIFs with ffmpeg (video / animated WebP / AVIF)

Optimizing a GIF with gifsicle only shrinks it *within* the GIF format (typically
10–30%). Replacing the GIF with **video** or an **animated modern image** saves
far more — usually **70–90%**. ffmpeg is the tool for this.

GIF modernization uses two **optional** tools (neither is one of the skill's
three core tools — check for them and prompt to install if absent):

- **ffmpeg** — GIF → video (and, with `libwebp`, animated WebP).
  macOS `brew install ffmpeg` · Debian/Ubuntu `sudo apt install ffmpeg` ·
  Fedora `sudo dnf install ffmpeg` · Arch `sudo pacman -S ffmpeg` ·
  Windows `winget install Gyan.FFmpeg`. Check: `ffmpeg -version`.
- **gif2webp** — GIF → animated WebP. Ships in the libwebp **`webp`** package
  (alongside `cwebp` / `img2webp` / `webpmux`); there is no standalone
  `gif2webp` formula. macOS `brew install webp` · Debian/Ubuntu/Fedora
  `apt/dnf install webp` · Arch `sudo pacman -S libwebp`. Check: `gif2webp -version`.

## Capability matters — check the encoders first

ffmpeg builds vary. What's possible depends on which encoders are compiled in:

```bash
ffmpeg -hide_banner -encoders | grep -E 'libx264|libvpx-vp9|libsvtav1|libaom-av1|libwebp'
```

| Encoder present | Enables |
|-----------------|---------|
| `libx264` | MP4 / H.264 (universal video fallback) |
| `libvpx-vp9` | WebM / VP9 (small video) |
| `libsvtav1` or `libaom-av1` | WebM / AV1 (smallest video) |
| `libwebp` | animated WebP (**often absent** — e.g. default Homebrew ffmpeg) |

> **Important limitations:**
> - ffmpeg's **AVIF muxer writes a *still* image, not animation** — encoding a GIF
>   to `.avif` yields a single frame and silently drops the animation. ffmpeg
>   cannot produce animated AVIF. (Verify with
>   `ffprobe -count_packets -show_entries stream=nb_read_packets out.avif` → `1`.)
> - Many ffmpeg builds **lack `libwebp`**, so they cannot encode WebP at all.
>
> Because of both gaps, **video is the recommended and most reliable path.** Only
> reach for animated WebP/AVIF when a single-file `<img>` is specifically needed
> and the right tooling is present.

## Recommended: convert to video

Produce two sources — **WebM** (smallest, modern) and **MP4/H.264** (universal
fallback). Strip audio (`-an`); GIFs have none. `yuv420p` + even dimensions are
required for broad playback.

```bash
# MP4 (H.264) — universal fallback
ffmpeg -i in.gif -an -movflags +faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -crf 23 -preset slow out.mp4

# WebM (VP9) — smaller
ffmpeg -i in.gif -an -c:v libvpx-vp9 -b:v 0 -crf 34 -pix_fmt yuv420p -row-mt 1 out.webm

# WebM (AV1, via SVT-AV1) — smallest; slower to encode
ffmpeg -i in.gif -an -c:v libsvtav1 -crf 38 -pix_fmt yuv420p out-av1.webm
```

Tune size/quality with `-crf` (higher = smaller/lower quality): H.264 ~20–28,
VP9 ~30–40, AV1 ~35–45. Example — a 356 KB GIF typically converts to roughly:

| Output | Size | vs GIF |
|--------|------|--------|
| Source GIF | 356 KB | — |
| gifsicle `-O3 --lossy=40 --colors 128` | 279 KB | −22% |
| MP4 / H.264 | 93 KB | −74% |
| WebM / VP9 | 80 KB | −78% |
| WebM / AV1 | 67 KB | −81% |

### Embed it like an autoplaying GIF

```html
<video autoplay muted loop playsinline preload="metadata"
       poster="clip-poster.webp" width="480" height="320"
       style="max-width:100%;height:auto" aria-label="Short description of the clip">
  <source src="clip-av1.webm" type="video/webm">  <!-- smallest first -->
  <source src="clip.webm"     type="video/webm">  <!-- VP9 -->
  <source src="clip.mp4"      type="video/mp4">   <!-- universal fallback -->
  <img src="clip.gif" alt="Short description of the clip" width="480" height="320">
</video>
```
The browser plays the first `<source>` it supports; the `<img>` is the last-resort
fallback.

## When to use video — extra considerations

- **Autoplay requires `muted`.** Browsers block autoplay with sound. GIF
  replacements are silent anyway — encode with `-an` and keep `muted`.
- **`playsinline`** — without it, iOS Safari forces autoplay video to fullscreen.
- **`loop`** — replicates GIF looping behaviour.
- **No `controls`** for a GIF-like silent loop. If controls are wanted, constrain
  them: `controls controlsList="nodownload nofullscreen noremoteplayback"
  disablepictureinpicture`.
- **`poster`** paints an instant first frame; export one with
  `ffmpeg -i in.gif -frames:v 1 clip-poster.webp` then compress it (rimage/caesiumclt).
- **`preload`** — `metadata` is light; use `auto` only for an above-the-fold loop
  you want to start instantly.
- **Respect `prefers-reduced-motion`.** Don't hard-code `autoplay`; gate it so
  reduced-motion users see the poster instead:
  ```html
  <video class="loop" muted loop playsinline preload="metadata" poster="clip-poster.webp" ...>
  ```
  ```js
  const v = document.querySelector('.loop');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    v.setAttribute('autoplay', ''); v.play().catch(() => {});
  }
  ```
- **Accessibility** — `<video>` has no `alt`; use `aria-label` and/or a visible
  caption. The `<img>` fallback keeps its `alt`.
- **Performance** — set `width`/`height` (avoid layout shift). For many
  offscreen clips, defer playback with an `IntersectionObserver` rather than
  autoplaying all at once.
- **Source order** — list smallest first (AV1 → VP9 → MP4); the browser stops at
  the first it can play.

## Animated WebP (single-file `<img>` drop-in)

A single animated *image* — a drop-in replacement for a GIF `<img>` with no
`<video>` markup, and broadly supported. Use it when markup must stay an `<img>`
(CMS fields, markdown that allows images but not video, simple galleries).

The tool is **gif2webp** (from the `webp` package; rimage's own `webp` codec is
static-only and cannot make animated WebP):

```bash
# Default keeps each frame lossless — best for flat UI / screen-recording GIFs
gif2webp -q 80 -m 6 in.gif -o out.webp

# Lossy frames — smaller, best for photographic / noisy GIFs
gif2webp -lossy -q 60 -m 6 in.gif -o out.webp
```
`-m 6` is maximum compression effort (slower). Confirm the result is animated:
`webpmux -info out.webp` (look for `Number of frames`). For building an animation
from a sequence of stills rather than a GIF, use `img2webp`.

Alternatively, an ffmpeg **built with `libwebp`** can encode it directly
(`ffmpeg -i in.gif -an -c:v libwebp -loop 0 -q:v 70 out.webp`) — but default
Homebrew ffmpeg lacks `libwebp`, so `gif2webp` is the reliable path.

## Animated AVIF (usually skip)

ffmpeg's avif muxer produces a **still image, not an animation**, so ffmpeg
cannot make animated AVIF. True animated AVIF needs specialized
tooling (e.g. `avifenc` on a frame sequence) and still has weaker, less
consistent browser/tooling support than video. For animated content, prefer
**video** (AV1 in WebM gives AVIF-class compression *with* solid support).

## Pros / cons summary

| Target | Size vs GIF | Browser support | Markup | Best for |
|--------|-------------|-----------------|--------|----------|
| Optimized GIF (gifsicle) | ~0.7–0.9× | universal | `<img>` | when GIF is *required* (email, chat, some markdown) |
| Animated WebP (gif2webp) | ~0.4–0.6× | very broad | `<img>` | single-file animated image; needs the `webp` package |
| Animated AVIF | ~0.2–0.4× | growing | `<img>` | rarely worth it; poor encoder tooling — prefer video |
| **Video (WebM + MP4)** | **~0.1–0.3×** | universal (w/ MP4 fallback) | `<video>` | **anything non-trivial on a page you control** |

## Decision guide

- **Page you control, non-trivial animation** → video (`<video>` with WebM + MP4).
- **Need a single animated image file (`<img>`)** → animated WebP via `gif2webp`.
- **Destination only accepts GIF** (email, Slack/Discord inline, some READMEs) →
  optimize the GIF with gifsicle (see `gifsicle.md`).
- **Animated AVIF** → generally avoid; use AV1-in-WebM video instead.
