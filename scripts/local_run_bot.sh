#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  cp .env apps/bot/.env
  cp .env packages/db/.env
  set -a
  source .env
  set +a
fi
export NODE_ENV=development
unset BOT_WEBHOOK_URL
unset BOT_WEBHOOK_PATH

npx -y pnpm@9.15.0 --filter @km/bot dev
