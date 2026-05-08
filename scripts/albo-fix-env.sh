#!/usr/bin/env bash
# Albo fix-env — set the Convex env vars that upstream's setup:dev forgets.
# Called from albo-create.sh, but safe to rerun manually.
#
# What it does:
#   1. Set BETTER_AUTH_URL, RESEND_EMAIL_SENDER, APP_NAME on Convex (and .env.local)
#   2. Set JWKS placeholder if not yet set (chicken-and-egg fix)
#   3. Mirror BETTER_AUTH_SECRET, BETTER_AUTH_SECRETS, AUTH_PROXY_SHARED_SECRET
#      from .env.local to Convex (upstream setup:env writes them locally only)
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

ENV_FILE="${PWD}/.env.local"

echo "→ Albo fix-env (mode=$MODE)"
echo "  BETTER_AUTH_URL=$SITE_URL"
echo "  RESEND_EMAIL_SENDER=$EMAIL_SENDER"
echo "  APP_NAME=$APP_NAME"

# ---------------------------------------------------------------------------
# Helper: read a value from .env.local (returns empty if not set)
# ---------------------------------------------------------------------------
read_env_local() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    grep "^${key}=" "$ENV_FILE" | sed "s|^${key}=||" | head -1 || true
  fi
}

# ---------------------------------------------------------------------------
# Helper: upsert a key=value pair in .env.local
# ---------------------------------------------------------------------------
upsert_env_local() {
  local key="$1"
  local value="$2"
  if [[ ! -f "$ENV_FILE" ]]; then
    touch "$ENV_FILE"
  fi
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE" && rm "${ENV_FILE}.bak"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

# ---------------------------------------------------------------------------
# Step 1 — Push Albo defaults (BETTER_AUTH_URL, etc.)
# ---------------------------------------------------------------------------
pnpm exec convex env set BETTER_AUTH_URL "$SITE_URL" >/dev/null
pnpm exec convex env set RESEND_EMAIL_SENDER "$EMAIL_SENDER" >/dev/null
pnpm exec convex env set APP_NAME "$APP_NAME" >/dev/null

upsert_env_local BETTER_AUTH_URL "$SITE_URL"
upsert_env_local RESEND_EMAIL_SENDER "$EMAIL_SENDER"
upsert_env_local APP_NAME "$APP_NAME"
upsert_env_local SITE_URL "$SITE_URL"

# ---------------------------------------------------------------------------
# Step 2 — JWKS placeholder if not set (chicken-and-egg unblock for first push)
# ---------------------------------------------------------------------------
if ! pnpm exec convex env list 2>/dev/null | grep -q "^JWKS="; then
  echo "  JWKS placeholder (will be replaced by real key after functions push)"
  pnpm exec convex env set JWKS '{"keys":[]}' >/dev/null
fi

# ---------------------------------------------------------------------------
# Step 3 — Mirror Better Auth secrets from .env.local to Convex
#          Upstream setup:env writes them locally only; Convex needs them too
#          for auth functions and JWT signing.
# ---------------------------------------------------------------------------
for SECRET in BETTER_AUTH_SECRET BETTER_AUTH_SECRETS AUTH_PROXY_SHARED_SECRET; do
  VALUE=$(read_env_local "$SECRET")
  if [[ -n "$VALUE" ]]; then
    pnpm exec convex env set "$SECRET" "$VALUE" >/dev/null
    echo "  ✓ mirrored $SECRET to Convex"
  else
    echo "  ⚠️  $SECRET not in .env.local — skip (will fail Better Auth at runtime)"
  fi
done

echo "✓ Albo fix-env done"
