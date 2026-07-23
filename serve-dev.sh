#!/usr/bin/env bash
# Servidor local con límites de subida suficientes para avatares.
# Debe ejecutarse con cwd = public/ (igual que `php artisan serve`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${1:-127.0.0.1}"
PORT="${2:-8000}"
ROUTER="${ROOT}/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"

cd "${ROOT}/public"
exec php \
  -d upload_max_filesize=20M \
  -d post_max_size=25M \
  -S "${HOST}:${PORT}" \
  "$ROUTER"
