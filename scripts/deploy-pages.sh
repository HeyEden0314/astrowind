#!/usr/bin/env bash
# Build and deploy the static Astro site to Cloudflare Pages (free tier).
# Requires: wrangler login with Pages write, Node 22+, npm ci already run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_NAME="${PAGES_PROJECT_NAME:-ai-intelligence}"
ARTICLES_API_URL="${ARTICLES_API_URL:-https://ai-intelligence-ingest.heyuan0314.workers.dev/api/articles}"
PRODUCTION_BRANCH="${PAGES_PRODUCTION_BRANCH:-main}"

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "❌ Not authenticated. Run: npx wrangler login"
  exit 1
fi

if ! npx wrangler pages project list 2>/dev/null | grep -q "$PROJECT_NAME"; then
  echo "→ Creating Pages project '$PROJECT_NAME'..."
  npx wrangler pages project create "$PROJECT_NAME" --production-branch="$PRODUCTION_BRANCH"
fi

echo "→ Building with ARTICLES_API_URL=$ARTICLES_API_URL"
ARTICLES_API_URL="$ARTICLES_API_URL" npm run build

echo "→ Deploying dist/ to Pages project $PROJECT_NAME (branch $PRODUCTION_BRANCH)..."
npx wrangler pages deploy dist --project-name="$PROJECT_NAME" --branch="$PRODUCTION_BRANCH" --commit-dirty=true

echo ""
echo "✅ Pages deploy complete."
echo "   Site: https://${PROJECT_NAME}.pages.dev"
echo "   API:  $ARTICLES_API_URL"
