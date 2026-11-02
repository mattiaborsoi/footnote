#!/bin/sh
# First-time setup of the production server, run from the owner's machine (which opens the SSH connection).
#   PROD_SSH=root@host scripts/bootstrap-droplet.sh
# Copies the compose file, the deploy folder and the maintenance script to /opt/footnote, installs the update timer,
# and prints the steps that need secrets by hand. Nothing is built on the server; it pulls the image CI built.
set -eu
: "${PROD_SSH:?set PROD_SSH=user@host}"
dir="${PROD_DIR:-/opt/footnote}"
cd "$(dirname "$0")/.."
ssh "$PROD_SSH" "mkdir -p '$dir/deploy' '$dir/scripts' '$dir/data/app'"
rsync -a compose.prod.yml deploy/ scripts/maintenance.sh "$PROD_SSH:$dir/" 2>/dev/null || {
  scp -q compose.prod.yml "$PROD_SSH:$dir/"; scp -qr deploy/. "$PROD_SSH:$dir/deploy/"; scp -q scripts/maintenance.sh "$PROD_SSH:$dir/scripts/"; }
ssh "$PROD_SSH" "chmod +x '$dir/deploy/update.sh' '$dir/scripts/maintenance.sh' \
  && cp '$dir/deploy/footnote-update.service' '$dir/deploy/footnote-update.timer' /etc/systemd/system/ \
  && systemctl daemon-reload && systemctl enable --now footnote-update.timer \
  && if [ ! -f '$dir/.env' ]; then cp '$dir/deploy/env.production.example' '$dir/.env'; fi && chmod 600 '$dir/.env'"
cat <<EOF

Installed under $dir on $PROD_SSH. By hand, on the server:
  1. Fill $dir/.env (SITE_HOST, APP_URL, APP_IMAGE, POSTGRES_PASSWORD, ANTHROPIC_API_KEY, LITELLM_*, SEARXNG_SECRET, AUTH_SECRET, ADMIN_TOKEN, SMTP_*, STRIPE_*).
  2. docker login ghcr.io   (a GitHub token with read:packages only)
  3. cd $dir && docker compose -f compose.prod.yml up -d
  4. The app's model key, once:
       curl -s -X POST http://127.0.0.1:4000/key/generate -H "Authorization: Bearer \$LITELLM_MASTER_KEY" \
         -H "Content-Type: application/json" -d '{"key_alias":"footnote-app","max_budget":30,"budget_duration":"30d","rpm_limit":60,"models":["haiku","opus"]}'
     Put the returned key in .env as LLM_API_KEY, then: docker compose -f compose.prod.yml up -d app
  5. Point the DNS name at this server. Caddy fetches the certificate on first request.
From then on every merge to main is live within about five minutes (deploy/update.sh on a timer).
EOF
