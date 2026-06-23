#!/usr/bin/env bash
# Stop a preview server started with start-preview.sh.
#
# Usage:
#   stop-preview.sh <state-dir>
#
# Reads <state-dir>/server.pid, terminates the process (SIGTERM then SIGKILL),
# and removes the state directory if it lives under a temp dir.
set -euo pipefail

STATE_DIR="${1:-}"
if [[ -z "$STATE_DIR" ]]; then echo '{"type":"error","reason":"missing state-dir arg"}'; exit 2; fi

PID_FILE="$STATE_DIR/server.pid"
if [[ ! -f "$PID_FILE" ]]; then echo '{"type":"server-stopped","status":"not_running"}'; exit 0; fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo '{"type":"server-stopped","status":"stale_pid"}'
  exit 0
fi

# Confirm the PID is our preview server before killing (guards PID reuse).
if ! ps -o command= -p "$pid" 2>/dev/null | grep -q "preview_server.py"; then
  echo '{"type":"server-stopped","status":"pid_mismatch","pid":'"$pid"'}'
  exit 0
fi

kill -TERM "$pid" 2>/dev/null || true
for _ in $(seq 1 20); do
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.1
done
if kill -0 "$pid" 2>/dev/null; then
  kill -KILL "$pid" 2>/dev/null || true
fi

rm -f "$PID_FILE"
# Only delete ephemeral temp state dirs, never project-relative ones.
case "$STATE_DIR" in
  /tmp/*|/private/tmp/*|"${TMPDIR%/}"/*) rm -rf "$STATE_DIR" ;;
esac

echo '{"type":"server-stopped","status":"stopped","pid":'"$pid"'}'
