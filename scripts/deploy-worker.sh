#!/usr/bin/env bash
# Deploy the ingest Worker to Cloudflare (free tier).
# Requires: wrangler login OR CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/worker"

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "❌ Not authenticated. Run: cd worker && npx wrangler login"
  echo "   Or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (API token needs Workers + D1 + AI edit)."
  exit 1
fi

DB_NAME="ai-intelligence"
CONFIG="$ROOT/worker/wrangler.toml"

if grep -q 'REPLACE_WITH_YOUR_D1_DATABASE_ID' "$CONFIG"; then
  echo "→ Creating D1 database '$DB_NAME'..."
  npx wrangler d1 create "$DB_NAME" --update-config --binding DB
else
  echo "→ Using existing D1 database_id from wrangler.toml"
fi

echo "→ Applying D1 migrations (remote)..."
npx wrangler d1 migrations apply "$DB_NAME" --remote

echo "→ Deploying Worker..."
npx wrangler deploy

WORKER_URL="https://ai-intelligence-ingest.$(npx wrangler whoami 2>/dev/null | grep -oP 'workers\.dev' || echo 'YOUR_SUBDOMAIN').workers.dev"
# wrangler deploy prints the real URL; show generic hint:
echo ""
echo "✅ Deploy complete. Worker URL is printed above (ai-intelligence-ingest.<subdomain>.workers.dev)."
echo ""
echo "Next steps:"
echo "  curl -X POST \"\$WORKER_URL/api/ingest\""
echo "  curl \"\$WORKER_URL/api/articles\""
echo ""
echo "Pages env: ARTICLES_API_URL=\$WORKER_URL/api/articles"
