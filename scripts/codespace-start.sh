#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if curl -sf http://localhost:8787/api/health >/dev/null 2>&1; then
  echo "DnD Companion уже запущен: http://localhost:8787"
  exit 0
fi

if [ ! -d node_modules ]; then
  npm install
fi

npm run build
exec npm start
