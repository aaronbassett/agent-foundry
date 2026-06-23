#!/usr/bin/env bash
# Start a local static server for an image-compression preview directory.
#
# Usage:
#   start-preview.sh --dir <preview-dir> [--open] [--state-dir <dir>]
#                    [--host 127.0.0.1] [--idle-timeout-minutes 240]
#
# Prints a JSON line: {"type":"server-started","url":"http://127.0.0.1:PORT/",...}
# Relay the "url" to the user, and stop the server later with:
#   stop-preview.sh <state-dir>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR=""
STATE_DIR=""
HOST="127.0.0.1"
TIMEOUT="240"
OPEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --state-dir) STATE_DIR="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --idle-timeout-minutes) TIMEOUT="$2"; shift 2 ;;
    --open) OPEN="--open"; shift ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$DIR" ]]; then echo "error: --dir is required" >&2; exit 2; fi
if [[ ! -d "$DIR" ]]; then echo "error: dir not found: $DIR" >&2; exit 2; fi

PY="$(command -v python3 || command -v python || true)"
if [[ -z "$PY" ]]; then echo "error: python3 not found on PATH" >&2; exit 1; fi

if [[ -z "$STATE_DIR" ]]; then
  STATE_DIR="${TMPDIR:-/tmp}/image-preview-$$-$(date +%s)"
fi
mkdir -p "$STATE_DIR"
LOG_FILE="$STATE_DIR/server.log"

# Launch detached so the server survives this shell.
nohup "$PY" "$SCRIPT_DIR/preview_server.py" \
  --dir "$DIR" \
  --state-dir "$STATE_DIR" \
  --host "$HOST" \
  --idle-timeout-minutes "$TIMEOUT" \
  $OPEN \
  > "$LOG_FILE" 2>&1 &
disown || true

# Wait (up to ~10s) for the server-started line.
for _ in $(seq 1 100); do
  if grep -q '"server-started"' "$LOG_FILE" 2>/dev/null; then
    grep '"server-started"' "$LOG_FILE" | head -1
    echo "state-dir: $STATE_DIR" >&2
    echo "stop with: $SCRIPT_DIR/stop-preview.sh \"$STATE_DIR\"" >&2
    exit 0
  fi
  sleep 0.1
done

echo "error: server did not start within 10s; see $LOG_FILE" >&2
cat "$LOG_FILE" >&2 || true
exit 1
