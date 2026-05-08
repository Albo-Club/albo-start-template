#!/usr/bin/env bash
# Albo fix-env — set the Convex env vars that upstream's setup:dev forgets.
# Called from albo-create.sh, but safe to rerun manually.
#
# Usage: bash scripts/albo-fix-env.sh [--mode albo|test] [--app-name "My App"]

set -euo pipefail

MODE="${ALBO_MODE:-test}"
APP_NAME="${ALBO_APP_NAME:-Albo Start Template}"
SITE_URL="${SITE_URL:-http://localhost:3000}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2;;
    --app-name) APP_NAME="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ "$MODE" == "albo" ]]; then
  EMAIL_SENDER="noreply@alboteam.com"
else
  EMAIL_SENDER="onboarding@resend.dev"
fi

echo "→ Albo fix-env (mode=$MODE)"
echo "  BETTER_AUTH_URL=$SITE_URL"
echo "  RESEND_EMAIL_SENDER=$EMAIL_SENDER"
echo "  APP_NAME=$APP_NAME"

# Push to Convex dev deployment
pnpm exec convex env set BETTER_AUTH_URL "$SITE_URL" >/dev/null
pnpm exec convex env set RESEND_EMAIL_SENDER "$EMAIL_SENDER" >/dev/null
pnpm exec convex env set APP_NAME "$APP_NAME" >/dev/null

# JWKS placeholder if not set (chicken-and-egg: required for first push)
if ! pnpm exec convex env list 2>/dev/null | grep -q "^JWKS="; then
  echo "  JWKS placeholder (will be replaced by real key after functions push)"
  pnpm exec convex env set JWKS '{"keys":[]}' >/dev/null
fi

# Mirror to .env.local (idempotent)
ENV_FILE="${PWD}/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  for KEY_VAL in "BETTER_AUTH_URL=$SITE_URL" "RESEND_EMAIL_SENDER=$EMAIL_SENDER" "APP_NAME=$APP_NAME" "SITE_URL=$SITE_URL"; do
    KEY="${KEY_VAL%%=*}"
    if grep -q "^${KEY}=" "$ENV_FILE"; then
      sed -i.bak "s|^${KEY}=.*|${KEY_VAL}|" "$ENV_FILE" && rm "${ENV_FILE}.bak"
    else
      echo "$KEY_VAL" >> "$ENV_FILE"
    fi
  done
fi

echo "✓ Albo fix-env done"
