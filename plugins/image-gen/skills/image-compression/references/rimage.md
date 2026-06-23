# rimage reference

Codec-quality compressor and format converter. Each output format is a
**subcommand**; preprocessing (resize, quantization) is shared. rimage is the
only tool in this skill that writes **AVIF**. Verified against rimage 0.12.3
(`rimage --help`, `rimage <codec> --help`).

## Invocation shape

```
rimage <CODEC> [OPTIONS] <FILES>...
```

### Codecs (output formats)
| Subcommand | Format | Notes |
|------------|--------|-------|
| `mozjpeg` | JPEG (MozJPEG) | **Recommended** JPEG encoder, smallest |
| `jpeg` | JPEG | standard |
| `oxipng` | PNG (OxiPNG) | strongest PNG optimizer |
| `png` | PNG | standard |
| `webp` | WebP | lossless-capable |
| `avif` | AVIF | small & efficient, **static images only** |
| `jpeg_xl` | JPEG-XL | large but lossless |
| `qoi` | QOI | fast, lossless |
| `farbfeld` / `ppm` | bitmap | rarely needed |

Input formats also include BMP, PSD, TIFF, HDR (input only for some).

### Shared "General" options (work on every codec)
| Flag | Meaning |
|------|---------|
| `-d, --directory <DIR>` | Output directory (default: overwrite in place) |
| `-r, --recursive` | Preserve folder structure (use with `-d`) |
| `-s, --suffix [<STR>]` | Append `@suffix` to output names (default `@updated`) |
| `-b, --backup` | Rename inputs with `@backup` before writing |
| `-t, --threads <N>` | Concurrency |
| `-x, --strip` | Strip metadata |
| `--no-progress` | Disable progress bar |

> **Default overwrites in place.** With no `-d`, rimage replaces the input file
> with the encoded result (changing its bytes; extension may not match). Always
> pass `-d <dir>` or `-b` unless overwriting in place is explicitly intended.

### Preprocessing (shared; applied in command-line order)
| Flag | Meaning |
|------|---------|
| `--resize <WxH \| Nw \| Nh>` | e.g. `1920x1080`, `1280w` (width, keep ratio), `720h` |
| `--no-upscale` / `--upscale` / `--no-downscale` | resize bounds |
| `--filter <nearest\|box\|bilinear\|...>` | resampling filter |
| `--quantization <N>` | reduce palette, N = quality % (great for flat/PNG art) |
| `--dithering <TYPE>` | dithering for quantization |

### mozjpeg / jpeg options
| Flag | Meaning |
|------|---------|
| `-q, --quality <N>` | 60–80 recommended (default 75) |
| `--chroma_quality <N>` | separate chroma quality |
| `--baseline` | baseline instead of progressive |
| `--smoothing <N>`, `--colorspace <ycbcr\|grayscale\|rgb>`, `--multipass`, `--qtable <TABLE>` | advanced |

### webp options
| Flag | Meaning |
|------|---------|
| `-q, --quality <N>` | 60–80 recommended (default 75) |
| `--lossless` | lossless WebP |
| `--slight_loss <N>` | near-lossless |
| `--exact` | preserve transparent pixel data |

### avif options
| Flag | Meaning |
|------|---------|
| `-q, --quality <N>` | default 50 (≈ q50–65 is a good web range) |
| `--speed <1-10>` | 1 = slowest/smallest, 10 = fast/larger (default 6) |
| `--alpha_quality <N>` | separate alpha quality |
| `--colorspace <ycbcr\|rgb>` | color space |

### oxipng / png options
| Flag | Meaning |
|------|---------|
| `--quality <N>` / effort flags | optimization effort (see `rimage oxipng --help`) |
| combine with `--quantization` | dramatic PNG size cuts for limited-palette art |

## Recipes

Best-quality JPEG (MozJPEG) at q78 into `out/`:
```bash
rimage mozjpeg -q 78 -d out/ photo.jpg
```

Convert to WebP q80:
```bash
rimage webp -q 80 -d out/ photo.png
```

Convert to AVIF q55, high effort (slow, smallest):
```bash
rimage avif -q 55 --speed 3 -d out/ photo.png
```

Resize to 1600px wide and encode WebP:
```bash
rimage webp -q 80 --resize 1600w -d out/ hero.png
```

Quantize + crush a flat PNG (icons, screenshots, illustrations):
```bash
rimage oxipng --quantization 80 -d out/ diagram.png
```

Batch a directory to AVIF, preserving structure:
```bash
rimage avif -q 55 -r -d out/ ./images/**/*.png
```
(Shell globs the files; rimage encodes each. Combine with `find` for deep trees —
see `batch-jobs.md`.)

## Notes
- **`-d` is the output directory here.** In caesiumclt, `-d` means `--dry-run`. Do
  not confuse them: `rimage -d out/` writes to `out/`; `caesiumclt -d` writes nothing.
- AVIF, WebP, PNG, OxiPNG codecs are **static only** — they cannot encode
  animation. For animated images use gifsicle (GIF), `gif2webp` (animated WebP),
  or ffmpeg (video) — see `gif-modernization.md`.
- rimage encodes one *target format per run*. To produce both WebP **and** AVIF,
  run it twice (one per codec).
- Quality scales differ per codec: AVIF q50 ≈ JPEG/WebP q75–80 visually. Use the
  preview workflow to pick real numbers rather than trusting the scale.
