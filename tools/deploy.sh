#!/usr/bin/env bash
# One-command deploy: push to GitHub, then deploy to Cloudflare Pages.
#
# First run does the full setup (creates GitHub repo, deploys, prints URL).
# Subsequent runs just push + redeploy.
#
# Prereqs (the script will tell you what's missing):
#   - gh CLI (https://cli.github.com)        brew install gh && gh auth login
#   - wrangler                                npm install -g wrangler && wrangler login
#   - Cloudflare account (free is fine)
#
# Run from anywhere — the script always operates on the repo it lives in.

set -euo pipefail

# Resolve the project root from the script location, regardless of CWD.
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

REPO_NAME=$(basename "$PROJECT_ROOT")
PAGES_PROJECT="$REPO_NAME"

color()   { printf "\033[1;%sm%s\033[0m\n" "$1" "$2"; }
info()    { color 36 "==> $1"; }
ok()      { color 32 "✓ $1"; }
warn()    { color 33 "! $1"; }
err()     { color 31 "✗ $1" >&2; exit 1; }

# ---- Preflight ---------------------------------------------------------

info "Preflight checks"

command -v git >/dev/null      || err "git not found"
command -v gh >/dev/null       || err "gh CLI not found. Install: brew install gh && gh auth login"
command -v wrangler >/dev/null || err "wrangler not found. Install: npm install -g wrangler && wrangler login"

gh auth status >/dev/null 2>&1 || err "gh CLI not authenticated. Run: gh auth login"

# Wrangler doesn't have a clean 'auth status' subcommand, so we'll just let
# the deploy step prompt for login if needed.

[ -f index.html ]               || err "index.html not found in $PROJECT_ROOT"
[ -d audio ]                    || err "audio/ directory missing"

AUDIO_COUNT=$(find audio -maxdepth 1 -name '*.m4a' -type f | wc -l | tr -d ' ')
if [ "$AUDIO_COUNT" -lt 13 ]; then
  warn "Only $AUDIO_COUNT/13 audio files found in audio/. The site will deploy, but tiles will 404 until you add them."
  printf "Continue anyway? [y/N] "
  read -r reply
  [ "$reply" = "y" ] || err "Aborted."
fi

ok "Preflight OK"

# ---- Commit any pending changes ---------------------------------------

if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Uncommitted changes detected:"
  git status --short
  printf "Commit them now? [y/N] "
  read -r reply
  if [ "$reply" = "y" ]; then
    printf "Commit message: "
    read -r msg
    git add -A
    git commit -m "$msg"
    ok "Committed"
  else
    err "Aborted. Commit or stash before deploying."
  fi
fi

# ---- GitHub repo + push -----------------------------------------------

info "GitHub"

if ! git remote get-url origin >/dev/null 2>&1; then
  info "No 'origin' remote — creating GitHub repo"
  printf "Repo visibility (public/private) [private]: "
  read -r vis
  vis=${vis:-private}
  gh repo create "$REPO_NAME" --"$vis" --source=. --remote=origin --push
  ok "Repo created and pushed"
else
  info "Pushing to existing remote: $(git remote get-url origin)"
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if git ls-remote --exit-code origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
    git push origin "$CURRENT_BRANCH"
  else
    git push -u origin "$CURRENT_BRANCH"
  fi
  ok "Pushed"
fi

# ---- Cloudflare Pages deploy ------------------------------------------

info "Cloudflare Pages"

# Files NOT to upload to Pages — keeps the deploy lean and avoids leaking
# spec/plan markdown publicly. (Pages serves whatever's in the deployed dir.)
DEPLOY_DIR=$(mktemp -d)
trap 'rm -rf "$DEPLOY_DIR"' EXIT

# Copy only the runtime files
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'tests' \
  --exclude 'tools' \
  --exclude 'docs' \
  --exclude '.superpowers' \
  --exclude 'package.json' \
  --exclude 'package-lock.json' \
  --exclude 'vitest.config.js' \
  --exclude '.gitignore' \
  --exclude 'README.md' \
  ./ "$DEPLOY_DIR/"

info "Deploying $DEPLOY_DIR to Cloudflare Pages project '$PAGES_PROJECT'"
wrangler pages deploy "$DEPLOY_DIR" --project-name="$PAGES_PROJECT" --commit-dirty=true

ok "Deployed"
echo ""
info "Site is live. The URL was printed above."
info "Connect a custom domain via the Cloudflare dashboard if you want a real address."
