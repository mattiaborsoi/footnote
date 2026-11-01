#!/bin/sh
# Pull the production database into the local mirror the dashboard reads.
# Runs on the owner's machine, which opens the SSH connection to production; production never connects back
# and no database port is opened there. Needs: ssh access to the production host, Docker here.
#   PROD_SSH=user@host [PROD_DIR=/opt/footnote] scripts/pull-prod.sh
set -eu
: "${PROD_SSH:?set PROD_SSH=user@host, the production machine}"
PROD_DIR="${PROD_DIR:-/opt/footnote}"
cd "$(dirname "$0")/.."
mkdir -p data
echo "dumping production over ssh…"
ssh "$PROD_SSH" "cd '$PROD_DIR' && docker compose exec -T db pg_dump -U footnote -Fc footnote" > data/prod.dump
echo "restoring into footnote_mirror…"
docker compose exec -T db sh -c 'dropdb -U footnote --if-exists footnote_mirror && createdb -U footnote footnote_mirror'
docker compose exec -T db pg_restore -U footnote -d footnote_mirror --no-owner --no-privileges < data/prod.dump
docker compose exec -T db psql -U footnote -d footnote -qc "insert into admin_marks (kind, key, ts) values ('mirror.pulled', 'prod', now()) on conflict (kind, key) do update set ts = excluded.ts"
rm -f data/prod.dump
echo "done: the dashboard now reads production as of now (ADMIN_DATABASE_URL must point at footnote_mirror)"
