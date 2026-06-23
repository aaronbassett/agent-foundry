# gifsicle reference

The tool for optimizing, compressing, resizing, and editing **GIF** images,
including animations. Verified against gifsicle 1.96 (`gifsicle --help`,
man page). For static images prefer caesiumclt/rimage; gifsicle's value is
animation and GIF-specific optimization.

## Invocation shape

```
gifsicle [OPTIONS] input.gif > output.gif      # stream to a new file
gifsicle -b [OPTIONS] input.gif                # edit in place (batch)
gifsicle [OPTIONS] -o output.gif input.gif     # explicit output
```

### Optimization levels
| Flag | Meaning |
|------|---------|
| `-O1` | store only changed portion of each frame (default-ish) |
| `-O2` | + use transparency for better inter-frame compression |
| `-O3` | try multiple methods, slowest, usually smallest |
| `-O3 --careful` | safer output for picky decoders |

### Lossy & color reduction (the big size wins)
| Flag | Meaning |
|------|---------|
| `--lossy[=N]` | lossy LZW (default 20; 30–80 = smaller, more artifacts) |
| `-k, --colors <2-256>` | reduce palette size (e.g. `--colors 64`) |
| `-f, --dither[=method]` | dither when reducing colors (floyd-steinberg default) |
| `--color-method <diversity\|blend-diversity\|median-cut>` | palette selection |
| `--gamma oklab` | pair with `--lossy` for better perceived quality |

### Resizing
| Flag | Meaning |
|------|---------|
| `--resize WxH` | exact size |
| `--resize-width N` / `--resize-height N` | keep aspect ratio |
| `--scale F` | scale by factor (e.g. `--scale 0.5`) |
| `--resize-fit WxH` | fit within box, keep ratio |
| `--resize-method <sample\|mix\|lanczos3\|...>` | resampler (mix default; lanczos3 sharper) |

### Frames & metadata
| Flag | Meaning |
|------|---------|
| `-b, --batch` | modify files in place |
| `-U, --unoptimize` | expand to full frames before editing |
| `--no-extensions` / `--no-comments` | strip metadata to save bytes |
| `--delete`, `--replace`, `--append`, `--insert-before` | frame editing |
| `-I, --info` | print GIF info (frames, sizes, delays) |

## Recipes

Inspect a GIF first (frame count, dimensions, palette):
```bash
gifsicle -I anim.gif | head -20
```

Standard optimize in place:
```bash
gifsicle -b -O3 anim.gif
```

Aggressive size reduction (optimize + 64 colors + lossy):
```bash
gifsicle -O3 --lossy=60 --colors 64 anim.gif -o anim-small.gif
```

Best perceived quality at a given lossiness:
```bash
gifsicle -O3 --lossy=40 --gamma oklab --colors 128 anim.gif -o out.gif
```

Halve dimensions and optimize:
```bash
gifsicle --scale 0.5 -O3 -b anim.gif
```

Strip metadata for extra bytes:
```bash
gifsicle -O3 --no-extensions --no-comments anim.gif -o out.gif
```

## Strongly consider replacing GIFs

Animated GIF is an inefficient format. gifsicle only shrinks *within* the GIF
format (≈10–30%). Replacing the GIF with a short muted **video** (WebM + MP4) or
an **animated WebP** is usually **70–90% smaller**. When the user controls the
page, recommend conversion — it needs `ffmpeg` (optional, not one of this skill's
three core tools).

See **`references/gif-modernization.md`** for the full workflow: ffmpeg commands
for video and animated WebP, the `<video>` embed (autoplay/muted/loop/playsinline,
controls, poster, reduced-motion), a pros/cons table, and a decision guide. Two
important caveats covered there: ffmpeg's AVIF muxer writes a *still* image (no
animated AVIF), and many ffmpeg builds lack `libwebp` (no WebP).

Keep using gifsicle (above) only when the destination **requires** GIF — email,
chat platforms, or markdown that can't embed video.

## Notes
- `-O` does not guarantee smaller output; test, and keep the smaller of input/output.
- Heavy `--lossy` + low `--colors` can badly degrade gradients; preview before committing.
- Use `-U` before frame edits on an already-optimized GIF, then re-`-O3`.
