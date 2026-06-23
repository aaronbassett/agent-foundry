# Web image optimization — best practices

How to take source images and produce correctly-sized, modern-format,
responsive assets for the web. This is the "what should I actually do" reference
for website use cases.

## The four levers (apply in this order)

1. **Resize** to the largest size actually displayed. This is the single biggest
   win — a 6000px camera photo shown in an 800px column is ~98% wasted bytes.
2. **Choose a modern format** (AVIF / WebP) over JPEG/PNG.
3. **Compress** at a sensible quality (not 100).
4. **Serve responsively** (`srcset` / `<picture>`) so each device downloads only
   what it needs.

## Sensible defaults for "an image on a website"

| Use | Max dimension | Format(s) | Quality |
|-----|---------------|-----------|---------|
| Full-width hero | 1920–2560px wide | AVIF + WebP (+ JPEG fallback) | AVIF q50–60, WebP q75–82 |
| In-article / content photo | 1200–1600px wide | AVIF + WebP | AVIF q50–58, WebP q75–80 |
| Thumbnail / card | 400–800px wide | WebP (AVIF optional) | q70–78 |
| Icon / logo / flat art | native, or 2× for retina | PNG (OxiPNG) or SVG; WebP lossless | quantize / lossless |
| Photographic, JPEG fallback only | as above | MozJPEG | q78–82 |

General rule: **q80 WebP** and **q55 AVIF** are safe, broadly-acceptable defaults
for photos. Always confirm with the preview workflow on real content before a
large batch — quality numbers are not comparable across codecs.

## Format decision tree

```
Is it animated?
  ├─ yes → <video> (best) or animated WebP; GIF only when required
  │        (see gif-modernization.md; optimize-only via gifsicle.md)
  └─ no
      Is it a photo / complex gradient?
        ├─ yes → AVIF (best) + WebP (fallback) + optional JPEG (MozJPEG) baseline
        └─ no (flat color, UI, logo, screenshot, text)
              ├─ has few colors → PNG via OxiPNG + --quantization, or WebP lossless
              └─ vector-like / could be SVG → recommend SVG instead of raster
```

- **AVIF**: smallest for photos, excellent at low bitrates; slower to encode;
  broadly supported across current browsers. Static only via rimage. (If a
  significant share of the audience is on old browsers, keep the WebP/JPEG
  fallback in `<picture>`.)
- **WebP**: great all-rounder, universal support, fast; the safe modern default.
- **JPEG (MozJPEG)**: only as a fallback for the oldest clients, or when the
  pipeline can't add `<picture>`.
- **PNG (OxiPNG)**: lossless, for flat art / transparency where WebP lossless
  isn't desired.

## Producing the modern formats

Per single image (one run per format — rimage encodes one format at a time):
```bash
# AVIF + WebP from a source, resized to 1600px wide
rimage avif -q 55 --resize 1600w -d out/ hero.png
rimage webp -q 80 --resize 1600w -d out/ hero.png
```

caesiumclt can do WebP in bulk quickly:
```bash
caesiumclt -q 80 --format webp --long-edge 1600 --no-upscale -R -S -o out/ ./images
```

## Responsive images: srcset & <picture>

Two complementary techniques:

### 1. `srcset` + `sizes` — same format, multiple resolutions
Let the browser pick a resolution based on viewport/DPR. Generate widths like
480 / 768 / 1024 / 1600 / 2400.

```html
<img
  src="photo-1024.webp"
  srcset="photo-480.webp 480w,
          photo-768.webp 768w,
          photo-1024.webp 1024w,
          photo-1600.webp 1600w,
          photo-2400.webp 2400w"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="..."
  loading="lazy"
  decoding="async"
  width="1600" height="1067">
```

- `sizes` tells the browser how wide the image renders at each breakpoint — set
  it to match your CSS layout, or the browser will over-download.
- Always set `width`/`height` (or `aspect-ratio` in CSS) to prevent layout shift.
- Use `loading="lazy"` for below-the-fold images; **not** for the LCP/hero image.

### 2. `<picture>` — format fallback (AVIF → WebP → JPEG)
The browser uses the first `<source>` it supports. Combine with `srcset` inside
each `<source>` for both axes (format **and** resolution):

```html
<picture>
  <source type="image/avif"
          srcset="photo-768.avif 768w, photo-1600.avif 1600w, photo-2400.avif 2400w"
          sizes="(max-width: 768px) 100vw, 800px">
  <source type="image/webp"
          srcset="photo-768.webp 768w, photo-1600.webp 1600w, photo-2400.webp 2400w"
          sizes="(max-width: 768px) 100vw, 800px">
  <img src="photo-1600.jpg" alt="..." loading="lazy" decoding="async"
       width="1600" height="1067">
</picture>
```

The bare `<img>` is the universal fallback and carries `alt`, sizing, and lazy
attributes.

### Generating a full responsive set
For each target width, encode each format. Example widths × {avif, webp}:
```bash
SRC=hero.png; BASE=hero; OUT=out
for w in 480 768 1024 1600 2400; do
  rimage avif -q 55 --resize "${w}w" --no-upscale -d "$OUT" -s "-${w}" "$SRC"
  rimage webp -q 80 --resize "${w}w" --no-upscale -d "$OUT" -s "-${w}" "$SRC"
done
# (rename/normalize to photo-<w>.<ext> as your markup expects)
```
`--no-upscale` ensures small sources aren't enlarged. See `batch-jobs.md` for
applying this across many source images.

## Quality / size targets & verification

- Aim for content images **< 150–250 KB**, heroes **< 300–500 KB** after resize.
- Largest Contentful Paint (LCP) image should be small and **not** lazy-loaded;
  consider `fetchpriority="high"`.
- Don't compress already-lossy sources repeatedly (generation loss) — always
  start from the highest-quality original available.
- **Verify before batching:** build a multi-variant preview (see `preview.md`)
  at a few quality levels and let the user pick the smallest that looks right,
  then apply that setting to the whole set.

## Common mistakes to avoid
- Shipping a 4000px image scaled down with CSS (resize the file instead).
- Quality 100 (huge files, no visible benefit; use q75–85 / AVIF q50–60).
- One giant image for all devices (use `srcset`).
- Lazy-loading the hero (hurts LCP).
- Omitting `width`/`height` (causes layout shift / poor CLS).
- Converting flat UI screenshots to JPEG (use PNG/WebP lossless to avoid ringing).
