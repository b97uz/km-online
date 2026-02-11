#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

NEW_PASSWORD="${1:-Admin12345}"
ADMIN_USERNAME_VALUE="${2:-admin}"

if [ -f .env ]; then
  cp .env packages/db/.env
  set -a
  source .env
  set +a
fi

export NODE_ENV=development
export ADMIN_USERNAME="$ADMIN_USERNAME_VALUE"
export ADMIN_PASSWORD="$NEW_PASSWORD"

echo "Resetting admin password for username: $ADMIN_USERNAME"
npx -y pnpm@9.15.0 db:seed

echo "Done. Login with:"
echo "username: $ADMIN_USERNAME"
echo "password: $ADMIN_PASSWORD"
