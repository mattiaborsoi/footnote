#!/bin/sh
# Runs on the server every five minutes (deploy/footnote-update.timer). Pulls the app image CI built on the last
# merge to main; when it changed, switches maintenance on, restarts the app, waits for health, switches it off.
# The server only ever connects outward: to the registry with a read-only token.
set -eu
cd /opt/footnote
compose="docker compose -f compose.prod.yml"
image=$(grep "^APP_IMAGE=" .env | cut -d= -f2-)
[ -n "$image" ] || { echo "APP_IMAGE missing from .env" >&2; exit 1; }
running=$(docker inspect --format '{{.Image}}' footnote-app-1 2>/dev/null || echo none)
$compose pull -q app
latest=$(docker image inspect --format '{{.Id}}' "$image")
[ "$running" = "$latest" ] && exit 0
echo "new image $latest, updating"
mkdir -p data/app
printf '{"message": "A new version is arriving. Back in a minute.", "since": "%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > data/app/maintenance.json
$compose up -d --no-deps app
for i in $(seq 1 30); do
  sleep 2
  if [ "$(docker inspect --format '{{.State.Health.Status}}' footnote-app-1 2>/dev/null)" = healthy ]; then break; fi
done
rm -f data/app/maintenance.json
docker image prune -f >/dev/null
echo "updated"
