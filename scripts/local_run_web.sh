#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti :3000 || true)"
  if [ -n "${PIDS}" ]; then
    kill -9 ${PIDS} || true
  fi
fi

rm -rf apps/web/.next

if [ -f .env ]; then
  cp .env apps/web/.env.local
  cp .env packages/db/.env
  set -a
  source .env
  set +a
fi
export NODE_ENV=development

npx -y pnpm@9.15.0 --filter @km/web dev
