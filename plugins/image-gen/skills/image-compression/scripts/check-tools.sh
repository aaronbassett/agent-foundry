#!/usr/bin/env bash
# Check which image-compression tools are installed and print OS-correct install
# hints for any that are missing.
#
# Usage: check-tools.sh
# Exit code: 0 if all three tools are present, 1 if any are missing.

set -uo pipefail

# Detect OS / package-manager family for install hints.
os="unknown"
case "$(uname -s)" in
  Darwin) os="macos" ;;
  Linux)  os="linux" ;;
  MINGW*|MSYS*|CYGWIN*) os="windows" ;;
esac

hint() {
  # $1 = tool key
  case "$1:$os" in
    caesiumclt:macos)   echo "    brew install caesiumclt   # or: cargo install caesiumclt" ;;
    caesiumclt:linux)   echo "    cargo install caesiumclt   # or download from https://github.com/Lymphatus/caesium-clt/releases" ;;
    caesiumclt:windows) echo "    winget install SaeraSoft.CaesiumCLT   # or: cargo install caesiumclt" ;;
    caesiumclt:*)       echo "    cargo install caesiumclt   # or https://github.com/Lymphatus/caesium-clt/releases" ;;

    rimage:macos)   echo "    cargo install rimage   # (cargo binstall rimage for a prebuilt binary)" ;;
    rimage:linux)   echo "    cargo install rimage   # (cargo binstall rimage for a prebuilt binary)" ;;
    rimage:windows) echo "    cargo install rimage   # requires the MSVC toolchain" ;;
    rimage:*)       echo "    cargo install rimage   # https://github.com/SalOne22/rimage/releases" ;;

    gifsicle:macos)   echo "    brew install gifsicle" ;;
    gifsicle:linux)   echo "    sudo apt install gifsicle   # Debian/Ubuntu  |  sudo dnf install gifsicle (Fedora)  |  sudo pacman -S gifsicle (Arch)" ;;
    gifsicle:windows) echo "    choco install gifsicle   # or: scoop install gifsicle" ;;
    gifsicle:*)       echo "    install 'gifsicle' from your package manager" ;;
  esac
}

# Use check/cross glyphs on UTF-8 terminals, ASCII elsewhere.
if locale charmap 2>/dev/null | grep -qi 'utf'; then
  MARK_OK=$'\xE2\x9C\x94'; MARK_NO=$'\xE2\x9C\x98'
else
  MARK_OK="OK"; MARK_NO="--"
fi

missing=0
printf "Image-compression tool check (OS: %s)\n\n" "$os"

for tool in caesiumclt rimage gifsicle; do
  if command -v "$tool" >/dev/null 2>&1; then
    ver="$("$tool" --version 2>/dev/null | head -1)"
    printf "  [%s] %-12s %s\n" "$MARK_OK" "$tool" "${ver:-installed}"
  else
    printf "  [%s] %-12s NOT FOUND\n" "$MARK_NO" "$tool"
    hint "$tool"
    missing=1
  fi
done

# Optional: ffmpeg enables GIF -> video / animated WebP. Not a core tool, so it
# does NOT affect the exit code.
ffmpeg_hint() {
  case "$os" in
    macos)   echo "    brew install ffmpeg" ;;
    linux)   echo "    sudo apt install ffmpeg   # or: sudo dnf install ffmpeg / sudo pacman -S ffmpeg" ;;
    windows) echo "    winget install Gyan.FFmpeg   # or: choco install ffmpeg / scoop install ffmpeg" ;;
    *)       echo "    install 'ffmpeg' from your package manager" ;;
  esac
}
webp_hint() {
  case "$os" in
    macos)   echo "    brew install webp" ;;
    linux)   echo "    sudo apt install webp   # or: sudo dnf install webp / sudo pacman -S libwebp" ;;
    windows) echo "    download libwebp: https://developers.google.com/speed/webp/download" ;;
    *)       echo "    install the 'webp' package from your package manager" ;;
  esac
}

echo
echo "Optional — GIF modernization:"
# ffmpeg: GIF -> video (and animated WebP if built with libwebp)
if command -v ffmpeg >/dev/null 2>&1; then
  fver="$(ffmpeg -hide_banner -version 2>/dev/null | head -1)"
  printf "  [%s] %-12s %s\n" "$MARK_OK" "ffmpeg" "${fver:-installed}"
  encs="$(ffmpeg -hide_banner -encoders 2>/dev/null | awk '{print $2}')"
  for e in libx264 libvpx-vp9 libsvtav1 libwebp; do
    if printf '%s\n' "$encs" | grep -qx "$e"; then
      printf "        - %-12s available\n" "$e"
    else
      printf "        - %-12s missing\n" "$e"
    fi
  done
  echo "        ffmpeg AVIF is still-image only => prefer video for animation"
else
  printf "  [%s] %-12s not found (GIF -> video)\n" "$MARK_NO" "ffmpeg"
  ffmpeg_hint
fi
# gif2webp: GIF -> animated WebP (ships in the 'webp' package)
if command -v gif2webp >/dev/null 2>&1; then
  printf "  [%s] %-12s %s\n" "$MARK_OK" "gif2webp" "$(gif2webp -version 2>/dev/null | head -1)"
else
  printf "  [%s] %-12s not found (animated WebP; ships in the 'webp' package)\n" "$MARK_NO" "gif2webp"
  webp_hint
fi

echo
if [[ "$missing" -eq 0 ]]; then
  echo "All core tools available."
else
  echo "Some core tools are missing — install the ones above before using those features."
fi
exit "$missing"
