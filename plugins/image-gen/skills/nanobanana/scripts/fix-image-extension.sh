#!/usr/bin/env bash
# Rename image file(s) so the extension matches the ACTUAL file content.
#
# The nanobanana MCP server can save JPEG bytes to a path ending in `.png`
# (and its response `mime_type` is not always accurate), producing a file whose
# extension does not match its content. This corrects the extension by reading
# the file's magic bytes — never trust the requested extension or the metadata.
#
# Usage:   fix-image-extension.sh <file> [<file> ...]
# Output:  the (possibly new) path for each input on stdout, one per line.
#          Rename actions are logged to stderr.
# Exit:    0 on success, 1 if any input was missing.
set -uo pipefail

ext_for_mime() {
  case "$1" in
    image/jpeg) echo "jpg" ;;
    image/png)  echo "png" ;;
    image/webp) echo "webp" ;;
    image/gif)  echo "gif" ;;
    image/avif) echo "avif" ;;
    image/tiff) echo "tiff" ;;
    *)          echo "" ;;
  esac
}

if [[ $# -eq 0 ]]; then
  echo "usage: fix-image-extension.sh <file> [<file> ...]" >&2
  exit 2
fi

status=0
for f in "$@"; do
  if [[ ! -f "$f" ]]; then
    echo "error: not found: $f" >&2
    status=1
    continue
  fi

  mime="$(file --mime-type -b "$f" 2>/dev/null)"
  want="$(ext_for_mime "$mime")"
  if [[ -z "$want" ]]; then
    echo "$f"                       # unknown/non-image type: leave untouched
    continue
  fi

  cur_lc="$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')"
  [[ "$cur_lc" == "jpeg" ]] && cur_lc="jpg"   # treat jpeg == jpg
  if [[ "$f" == *.* && "$cur_lc" == "$want" ]]; then
    echo "$f"                       # extension already correct
    continue
  fi

  base="$f"; [[ "$f" == *.* ]] && base="${f%.*}"
  new="$base.$want"
  i=1
  while [[ -e "$new" && "$new" != "$f" ]]; do
    new="${base}-${i}.${want}"
    i=$((i + 1))
  done

  mv -- "$f" "$new"
  echo "$new"
  echo "renamed: $f -> $new" >&2
done

exit "$status"
