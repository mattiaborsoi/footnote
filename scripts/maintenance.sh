#!/bin/sh
# Flip maintenance mode on a Footnote instance.
#   scripts/maintenance.sh on "Back in an hour."     scripts/maintenance.sh off
# With PROD_SSH=user@host (and PROD_DIR, default /opt/footnote) it acts on production over SSH, opened from here;
# without it, on this checkout (the test environment). The app reads data/maintenance.json on every request.
set -eu
mode="${1:-}"; msg="${2:-We are doing some work on Footnote. Back soon.}"
[ "$mode" = on ] || [ "$mode" = off ] || { echo "usage: $0 on [message] | off" >&2; exit 2; }
dir="${PROD_DIR:-/opt/footnote}"
json=$(printf '{"message": %s, "since": "%s"}' "$(printf %s "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '"%s"' "$msg")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
if [ -n "${PROD_SSH:-}" ]; then
  if [ "$mode" = on ]; then ssh "$PROD_SSH" "mkdir -p '$dir/data/app' && printf '%s' '$json' > '$dir/data/app/maintenance.json'"; else ssh "$PROD_SSH" "rm -f '$dir/data/app/maintenance.json'"; fi
else
  cd "$(dirname "$0")/.."; mkdir -p data
  if [ "$mode" = on ]; then printf '%s' "$json" > data/maintenance.json; else rm -f data/maintenance.json; fi
fi
echo "maintenance $mode"
