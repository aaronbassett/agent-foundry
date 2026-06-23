# Tool Selection & Installation

Three CLI tools cover the full range of image compression tasks. None can be
assumed present — always run `scripts/check-tools.sh` (or `<tool> --version`)
before using a tool, and prompt the user to install anything missing.

## The three tools

| Tool | Binary | Strengths | Formats (out) |
|------|--------|-----------|---------------|
| **caesiumclt** | `caesiumclt` | Fast batch JPEG/PNG/WebP compression, resizing, recursive directory trees, structure-preserving output, metadata control | jpeg, png, gif, webp, tiff |
| **rimage** | `rimage` | Best-in-class per-format codecs (MozJPEG, OxiPNG, libwebp, AVIF), format conversion, quantization, the **only** tool here that writes AVIF | avif, jpeg (mozjpeg), png (oxipng), webp, jpeg-xl, qoi, ppm, farbfeld |
| **gifsicle** | `gifsicle` | Animated GIF optimization, lossy GIF, color reduction, frame editing, GIF resizing | gif |

## Decision matrix — which tool for the job

| Task | Use | Why |
|------|-----|-----|
| Compress a folder of JPEGs/PNGs in place or to a mirror | **caesiumclt** | Native recursive (`-R`), structure-preserving (`-S`), per-file output policy |
| Hit a target file size (e.g. "under 200KB") | **caesiumclt** | `--max-size 200KB` does iterative search |
| Convert JPEG/PNG → **WebP** | either | rimage `webp` codec is higher quality; caesiumclt `--format webp` is faster for bulk |
| Convert JPEG/PNG → **AVIF** | **rimage** | Only rimage writes AVIF (`rimage avif`) |
| Squeeze a single hero/important image to max quality-per-byte | **rimage** | MozJPEG/OxiPNG/AVIF beat generic encoders |
| Lossless PNG crush | **rimage oxipng** or **caesiumclt --lossless --zopfli** | OxiPNG and zopfli are the strongest PNG optimizers |
| Optimize / shrink an animated **GIF** | **gifsicle** | The only tool that understands GIF frames |
| Consider replacing a GIF entirely | (advise the user) | Modern animated WebP/AVIF/`<video>` are far smaller; gifsicle only shrinks within GIF |
| Resize during compression | caesiumclt (`--width/--long-edge`) or rimage (`--resize`) or gifsicle (`--resize`) | all support it |

**Rule of thumb:** caesiumclt for *throughput* (batch JPEG/PNG/WebP), rimage for
*quality and AVIF*, gifsicle for *anything GIF*.

## Checking availability (always do this first)

```bash
scripts/check-tools.sh          # checks all three, prints install hints, exit 1 if any missing
caesiumclt --version            # or check individually
rimage --version
gifsicle --version
```

Never proceed with a tool that is not installed. If a tool is missing, show the
user the exact install command for their OS (below) and ask them to install it,
rather than silently falling back or guessing.

## Installation commands by OS

### caesiumclt
| OS | Command |
|----|---------|
| macOS | `brew install caesiumclt` (or `cargo install caesiumclt`) |
| Linux | `cargo install caesiumclt` (or prebuilt binary, see below) |
| Windows | `winget install SaeraSoft.CaesiumCLT` (or `cargo install caesiumclt`) |
| Any (prebuilt) | Download from https://github.com/Lymphatus/caesium-clt/releases |

### rimage
| OS | Command |
|----|---------|
| macOS / Linux / Windows | `cargo install rimage` |
| Faster (prebuilt via cargo) | `cargo binstall rimage` |
| Any (prebuilt) | Download from https://github.com/SalOne22/rimage/releases |

`rimage` requires the Rust toolchain when built from source. If `cargo` is
missing, point the user to https://rustup.rs (`curl --proto '=https' --tlsv1.2
-sSf https://sh.rustup.rs | sh`) or to the prebuilt releases. On Windows, rimage
needs the MSVC toolchain (not MinGW).

### gifsicle
| OS | Command |
|----|---------|
| macOS | `brew install gifsicle` |
| Debian / Ubuntu | `sudo apt install gifsicle` |
| Fedora | `sudo dnf install gifsicle` |
| Arch | `sudo pacman -S gifsicle` |
| Windows | `choco install gifsicle` or `scoop install gifsicle` |

## Detecting the OS

`scripts/check-tools.sh` already prints OS-correct hints. To detect manually:
`uname -s` → `Darwin` (macOS), `Linux`, or `MINGW*/MSYS*` (Windows shells).
