#!/usr/bin/env bash
# ============================================================================
# Albo Create — one-shot bootstrap d'un nouveau projet
# Usage:
#   bash scripts/albo-create.sh <project-name> [--mode albo|test]
#
# Si lancé depuis l'intérieur d'un clone du template, configure le projet courant.
# Sinon, clone/forke le template et configure dans ~/Documents/Albo/<project-name>.
#
# Cible : git clone → localhost prêt en < 5 min
# ============================================================================

set -euo pipefail

# Silence cosmetic Node engine warnings (upstream wants ≥24, 22+ works fine)
export PNPM_CONFIG_ENGINE_STRICT=false
export NPM_CONFIG_ENGINE_STRICT=false

# --- Helpers ----------------------------------------------------------------

# Spinner during a silent background command. Usage: cmd & spin $! "msg"
spin() {
  local pid=$1
  local msg=$2
  local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  # tput cnorm/civis hide/show cursor; ignore on dumb terminals
  command -v tput >/dev/null && tput civis 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  %s %s   " "${chars:$((i % 10)):1}" "$msg"
    sleep 0.1
    i=$((i+1))
  done
  command -v tput >/dev/null && tput cnorm 2>/dev/null || true
  printf "\r  ✓ %s          \n" "$msg"
}

# --- Args parsing ------------------------------------------------------------

PROJECT_NAME="${1:-}"
MODE_FLAG="auto"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE_FLAG="$2"; shift 2;;
    --albo)
      MODE_FLAG="albo"; shift;;
    --test)
      MODE_FLAG="test"; shift;;
    -h|--help)
      echo "Usage: bash scripts/albo-create.sh <project-name> [--mode albo|test]"
      exit 0;;
    *)
      if [[ -z "$PROJECT_NAME" ]]; then
        PROJECT_NAME="$1"
      fi
      shift;;
  esac
done

if [[ -z "$PROJECT_NAME" ]]; then
  echo "❌ Project name required. Usage: bash scripts/albo-create.sh <project-name>"
  exit 1
fi

# --- Step 1: Preflight -------------------------------------------------------

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Albo Create — bootstrap '$PROJECT_NAME'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "→ [1/14] Preflight checks"

for cmd in gh pnpm node; do
  if ! command -v "$cmd" >/dev/null; then
    echo "❌ Missing required command: $cmd"
    echo "   Install with: brew install $cmd"
    exit 1
  fi
done

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "⚠️  Node $NODE_MAJOR detected, recommended ≥22 (template wants ≥24)"
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh not authenticated. Run: gh auth login"
  exit 1
fi

# Detect mode (Albo vs test)
if [[ "$MODE_FLAG" == "auto" ]]; then
  if gh api user/orgs --jq '.[].login' 2>/dev/null | grep -qiE "^(Albo-Club|alboteam)$"; then
    MODE="albo"
  else
    MODE="test"
  fi
else
  MODE="$MODE_FLAG"
fi

echo "  ✓ gh authenticated as $(gh api user --jq '.login')"
echo "  ✓ Mode: $MODE"

# --- Step 2: Clone or use current dir ----------------------------------------

CURRENT_REPO=$(git remote get-url origin 2>/dev/null || echo "")
TARGET_DIR=""

if [[ "$CURRENT_REPO" == *"albo-start-template"* ]]; then
  # We're inside a clone of the template — user wants to bootstrap THIS clone
  echo "→ [2/14] Bootstrapping current directory (already cloned)"
  TARGET_DIR="$PWD"
else
  echo "→ [2/14] Creating GitHub repo from template"
  TARGET_DIR="$HOME/Documents/Albo/$PROJECT_NAME"

  if [[ -d "$TARGET_DIR" ]]; then
    echo "❌ $TARGET_DIR already exists. Pick another name or delete it first."
    exit 1
  fi

  if [[ "$MODE" == "albo" ]]; then
    OWNER="Albo-Club"
  else
    OWNER=$(gh api user --jq '.login')
  fi

  gh repo create "$OWNER/$PROJECT_NAME" \
    --private \
    --template "Albo-Club/albo-start-template" \
    --clone

  # gh creates in CWD. Move into Albo dir if not already there.
  if [[ ! -d "$TARGET_DIR" ]]; then
    mv "$PROJECT_NAME" "$TARGET_DIR"
  fi
  cd "$TARGET_DIR"
fi

# --- Step 3: Install deps ----------------------------------------------------

echo "→ [3/14] Installing dependencies (~1 min)"
PNPM_LOG="/tmp/albo-pnpm-$$.log"
pnpm install --silent >"$PNPM_LOG" 2>&1 &
spin $! "downloading and linking packages (this is the slowest step)"
rm -f "$PNPM_LOG"

# --- Step 4: Provision Convex deployment -------------------------------------

echo "→ [4/14] Provisioning Convex dev deployment"
echo ""
echo "  ⚠️  Convex CLI peut te demander 2 questions interactives :"
echo "     1. 'Where should this dev deployment run?' → Enter (Europe par défaut)"
echo "     2. 'Set up Convex AI files? (Y/n)' → Y (ou juste Enter)"
echo "     (Si tu set ta région par défaut dans https://dashboard.convex.dev/t/<team>/settings,"
echo "      tu n'auras plus jamais ce premier prompt sur tes futurs projets.)"
echo ""

# Override with CONVEX_TEAM env var if you have multiple teams and want to force one.
TEAM_FLAG=""
if [[ -n "${CONVEX_TEAM:-}" ]]; then
  TEAM_FLAG="--team $CONVEX_TEAM"
  echo "  Using team override: $CONVEX_TEAM"
fi

# IMPORTANT: do NOT capture output with $(...) — it disables Convex CLI's
# interactive prompts (Ink-based TUI hides itself when stdout is piped).
# Stream live so user can answer team prompts if needed. Use tee for logging.
CONVEX_LOG="/tmp/albo-create-convex-$$.log"
set +e
pnpm exec convex dev --once \
  --configure new \
  $TEAM_FLAG \
  --project "$PROJECT_NAME" \
  --dev-deployment cloud 2>&1 | tee "$CONVEX_LOG"
CONVEX_EXIT=${PIPESTATUS[0]}
set -e

# Detect known errors and abort cleanly
if grep -q "Team .* not found" "$CONVEX_LOG"; then
  echo ""
  echo "❌ Convex doesn't know your team slug."
  echo "   Find your team slug at https://dashboard.convex.dev (URL: /t/<your-slug>)"
  echo "   Then re-run with: CONVEX_TEAM=<your-slug> bash scripts/albo-create.sh $PROJECT_NAME"
  rm -f "$CONVEX_LOG"
  exit 1
fi

# JWKS error at this stage is EXPECTED (we'll fix it in step 6) — don't abort.
# But absence of CONVEX_DEPLOYMENT means provisioning truly failed.
if ! grep -q "^CONVEX_DEPLOYMENT=" .env.local 2>/dev/null; then
  echo ""
  echo "❌ Convex provisioning failed — no CONVEX_DEPLOYMENT in .env.local"
  echo "   See the output above for the real error."
  rm -f "$CONVEX_LOG"
  exit 1
fi
rm -f "$CONVEX_LOG"
echo "  ✓ Convex deployment provisioned"

# --- Step 5: Generate Better Auth secrets ------------------------------------

echo "→ [5/14] Generating Better Auth secrets (auto-extract if upstream prints to stdout)"
if ! grep -q "^BETTER_AUTH_SECRET=" .env.local 2>/dev/null; then
  # Capture the printed secrets — upstream setup:env doesn't append if .env.local exists
  SETUP_OUT=$(pnpm setup:env 2>&1 || true)
  echo "$SETUP_OUT" | tail -3

  # Extract any printed BETTER_AUTH_*/AUTH_PROXY_* lines and append to .env.local
  EXTRACTED=$(echo "$SETUP_OUT" | grep -E "^(BETTER_AUTH_SECRETS?|AUTH_PROXY_SHARED_SECRET)=" || true)
  if [[ -n "$EXTRACTED" ]]; then
    echo "   ✓ Extracted secrets from setup:env stdout, appending to .env.local"
    echo "" >> .env.local
    echo "# Better Auth secrets (auto-appended by albo-create.sh)" >> .env.local
    echo "$EXTRACTED" >> .env.local
  fi
fi

# --- Step 6: Apply Albo fixes (env vars) -------------------------------------

echo "→ [6/14] Applying Albo env fixes (BETTER_AUTH_URL, JWKS placeholder, etc.)"
APP_NAME_PRETTY=$(echo "$PROJECT_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)$i=toupper(substr($i,1,1)) substr($i,2)}1')
ALBO_MODE="$MODE" ALBO_APP_NAME="$APP_NAME_PRETTY" bash scripts/albo-fix-env.sh

# --- Step 7: Push functions --------------------------------------------------

echo "→ [7/14] Pushing Convex functions"
PUSH_LOG="/tmp/albo-push-$$.log"
pnpm exec convex dev --once >"$PUSH_LOG" 2>&1 &
spin $! "compiling and uploading Convex functions (~20s)"
rm -f "$PUSH_LOG"

# --- Step 8: Sync real JWKS --------------------------------------------------

echo "→ [8/14] Syncing JWKS from Better Auth"
JWKS_LOG="/tmp/albo-jwks-$$.log"
(
  pnpm convex:jwks:sync >"$JWKS_LOG" 2>&1
  if ! grep -q "synced" "$JWKS_LOG"; then
    # Workaround for known upstream bug (see KNOWN_ISSUES.md #3)
    JWKS_RAW=$(pnpm exec convex run auth:getLatestJwks 2>/dev/null)
    JWKS_VALUE=$(node -e "process.stdout.write(JSON.parse(process.argv[1]))" "$JWKS_RAW")
    pnpm exec convex env set JWKS "$JWKS_VALUE" >/dev/null 2>&1
    echo "applied workaround" >>"$JWKS_LOG"
  fi
) &
spin $! "generating and pushing JWT signing keys"
rm -f "$JWKS_LOG"

# --- Step 9: Optional API keys -----------------------------------------------

echo "→ [9/14] Optional API keys (press Enter to skip each)"

read -p "   Resend API key (for sending emails): " RESEND_KEY || RESEND_KEY=""
if [[ -n "$RESEND_KEY" ]]; then
  pnpm exec convex env set RESEND_API_KEY "$RESEND_KEY" >/dev/null
  if grep -q "^RESEND_API_KEY=" .env.local; then
    sed -i.bak "s|^RESEND_API_KEY=.*|RESEND_API_KEY=$RESEND_KEY|" .env.local && rm .env.local.bak
  else
    echo "RESEND_API_KEY=$RESEND_KEY" >> .env.local
  fi
  echo "   ✓ Resend configured"
fi

read -p "   Anthropic API key (for AI chat): " ANTHROPIC_KEY || ANTHROPIC_KEY=""
if [[ -n "$ANTHROPIC_KEY" ]]; then
  pnpm exec convex env set ANTHROPIC_API_KEY "$ANTHROPIC_KEY" >/dev/null
  if grep -q "^ANTHROPIC_API_KEY=" .env.local; then
    sed -i.bak "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$ANTHROPIC_KEY|" .env.local && rm .env.local.bak
  else
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> .env.local
  fi
  echo "   ✓ Anthropic configured"
fi

# --- Step 10: Final readiness check ------------------------------------------

echo "→ [10/14] Running deploy:doctor (final readiness check)"
DOCTOR_LOG="/tmp/albo-doctor-$$.log"
pnpm run deploy:doctor >"$DOCTOR_LOG" 2>&1 &
spin $! "verifying tooling, env vars, JWKS, secrets"
# Show the doctor summary (✅/❌/⚠️ checks) but skip the verbose prelude
grep -E "^(✅|❌|⚠️)" "$DOCTOR_LOG" | head -20 | sed 's/^/   /'
rm -f "$DOCTOR_LOG"

# --- Step 11: Initial commit (skipping hooks for bootstrap speed) ------------

echo "→ [11/14] Initial Albo commit (hooks skipped — they'll run on your real commits)"
git add -A 2>/dev/null || true
if ! git diff --cached --quiet 2>/dev/null; then
  git commit --quiet --no-verify -m "chore: bootstrap from albo-start-template at $(date +%Y-%m-%d)" || true
  if git remote get-url origin 2>/dev/null | grep -q "$PROJECT_NAME"; then
    git push --no-verify --quiet origin HEAD 2>&1 | tail -2 || echo "   (push skipped — run 'git push' manually when ready)"
  fi
fi
echo "  ✓ committed and pushed"

# --- Step 12: Open repo in browser (Albo mode only) --------------------------

if [[ "$MODE" == "albo" ]]; then
  echo "→ [12/14] Opening GitHub repo in browser"
  open "https://github.com/Albo-Club/$PROJECT_NAME" 2>/dev/null || true
fi

# --- Step 13: Start dev server -----------------------------------------------

echo "→ [13/14] Starting dev server (Vite + Convex in parallel)"
echo "  ⏳ Booting — this takes ~10-15 seconds..."

DEV_LOG="/tmp/albo-dev-$$.log"
pnpm dev >"$DEV_LOG" 2>&1 &
DEV_PID=$!

# Wait for Vite to respond on port 3000 (max 60s)
READY=0
for i in $(seq 1 60); do
  if curl -sf -o /dev/null --max-time 1 http://localhost:3000/ 2>/dev/null; then
    READY=1
    break
  fi
  printf "."
  sleep 1
done
printf "\n"

if [[ "$READY" -eq 0 ]]; then
  echo ""
  echo "⚠️  Dev server didn't respond on http://localhost:3000 within 60s."
  echo "   Tail of dev server log:"
  tail -20 "$DEV_LOG"
  echo ""
  echo "   Continuing anyway — the server may still come up. Logs streaming below."
fi

# --- Step 14: Final summary + browser ---------------------------------------

DEPLOY_NAME=$(grep "^CONVEX_DEPLOYMENT=" .env.local 2>/dev/null | sed 's/^CONVEX_DEPLOYMENT=dev:\([^ ]*\).*/\1/' || echo "")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ $PROJECT_NAME ready in ${SECONDS}s — let's go"
echo ""
echo "  🌐  App:       http://localhost:3000"
echo "  📁  Local:     $TARGET_DIR"
if [[ -n "$DEPLOY_NAME" ]]; then
  echo "  ⚙️   Convex:    https://dashboard.convex.dev/d/$DEPLOY_NAME"
fi
if [[ "$MODE" == "albo" ]]; then
  echo "  📦  GitHub:    https://github.com/Albo-Club/$PROJECT_NAME"
fi
echo "  🔧  Mode:      $MODE"
echo ""
echo "  Browser will open. Press Ctrl+C in this terminal to stop the dev server."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

open "http://localhost:3000" 2>/dev/null || true

# Stream dev server logs and block until user kills the server
trap "kill $DEV_PID 2>/dev/null; rm -f $DEV_LOG; exit 0" INT TERM
tail -f "$DEV_LOG" &
TAIL_PID=$!
wait $DEV_PID
kill $TAIL_PID 2>/dev/null || true
rm -f "$DEV_LOG"
