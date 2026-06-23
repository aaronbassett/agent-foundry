# caesiumclt reference

Fast lossy/lossless compressor for JPEG, PNG, WebP (and GIF/TIFF passthrough),
with resizing, recursive batch processing, and format conversion. Verified
against caesiumclt 1.3.0 (`caesiumclt --help`).

## Invocation shape

```
caesiumclt <COMPRESSION> <DESTINATION> [OPTIONS] [FILES...]
```

At least one **compression** flag and one **destination** flag are required.
`FILES` may be individual files or directories.

### Compression (pick one)
| Flag | Meaning |
|------|---------|
| `-q, --quality <0-100>` | Lossy quality, higher = better |
| `--lossless` | Lossless (may grow some files) |
| `--max-size <SIZE>` | Target max size; accepts bytes or `100KB` / `0.5MB` |

### Destination (pick one)
| Flag | Meaning |
|------|---------|
| `-o, --output <DIR>` | Output directory |
| `--same-folder-as-input` | Write next to inputs (**can overwrite originals** — use `--suffix`) |

### Common options
| Flag | Meaning |
|------|---------|
| `--format <jpeg\|png\|gif\|webp\|tiff\|original>` | Convert format (default `original`) |
| `--suffix <STR>` | Append suffix to output names (e.g. `-compressed`) |
| `-R, --recursive` | Recurse into directories |
| `-S, --keep-structure` | Mirror the input folder tree (needs `-R`) |
| `--overwrite <all\|never\|bigger>` | Overwrite policy |
| `--min-savings <N>` | Skip writing if savings below threshold |
| `-d, --dry-run` | Simulate, write nothing |
| `--threads <N>` | Parallelism |
| `--json` | Machine-readable output |
| `-Q, --quiet` / `--verbose <0-3>` | Output level |

### Resizing
| Flag | Meaning |
|------|---------|
| `--width <PX>` / `--height <PX>` | Set one; aspect ratio preserved if other omitted |
| `--long-edge <PX>` | Constrain the longest edge (best for "max 1920px") |
| `--short-edge <PX>` | Constrain the shortest edge |
| `--no-upscale` | Never enlarge |

### JPEG / PNG tuning
| Flag | Meaning |
|------|---------|
| `--jpeg-chroma-subsampling <4:4:4\|4:2:2\|4:2:0\|4:1:1\|auto>` | Chroma subsampling |
| `--jpeg-baseline` | Baseline instead of progressive |
| `--png-opt-level <0-6>` | PNG effort (default 3) |
| `--zopfli` | Strongest PNG compression (much slower) |

### Metadata
| Flag | Meaning |
|------|---------|
| `-e, --exif` | Keep EXIF |
| `--keep-dates` | Preserve timestamps |
| `--strip-icc` | Strip ICC profile from JPG |

## Recipes

Compress one JPEG at quality 80 into `out/`:
```bash
caesiumclt -q 80 -o out/ photo.jpg
```

Compress a whole tree of JPEGs/PNGs, mirroring structure, into `dist/`:
```bash
caesiumclt -q 82 -R -S -o dist/ ./images
```

Lossless PNG crush with zopfli (slow, smallest), writing a suffixed copy beside input:
```bash
caesiumclt --lossless --zopfli --png-opt-level 6 --same-folder-as-input --suffix -min logo.png
```

Hit a hard size budget (e.g. email attachment under 500KB):
```bash
caesiumclt --max-size 500KB -o out/ big-photo.jpg
```

Resize to max 1920px on the long edge **and** compress, no upscaling:
```bash
caesiumclt -q 80 --long-edge 1920 --no-upscale -o web/ ./photos -R
```

Convert a folder of PNGs to WebP at q80:
```bash
caesiumclt -q 80 --format webp -R -S -o webp/ ./png-assets
```

Preview what would happen without writing files:
```bash
caesiumclt -q 80 --dry-run -R -o out/ ./images
```

## Notes
- **`Cannot convert to the same format` error?** caesiumclt detects format from
  the file's *content* (magic bytes), not its extension. The error means the
  input is already the target `--format` — common when a file carries the wrong
  extension (e.g. AI-generated JPEG bytes saved as `.png`, then `--format jpeg`).
  Confirm the real type with `file --mime-type -b <file>`, rename to match, or
  pick a different `--format`.
- **`-d` is `--dry-run` here.** In rimage, `-d` is the *output directory*. Do not
  confuse them: `caesiumclt -d` writes nothing; `rimage -d out/` sets the output dir.
- caesiumclt does **not** write AVIF — use rimage for AVIF.
- For animated GIFs use gifsicle; caesiumclt treats GIF as passthrough.
- `--same-folder-as-input` without `--suffix` can overwrite originals; prefer
  `-o` to a separate directory, or always add `--suffix`.
- Use `--json` when parsing results programmatically (size before/after per file).
