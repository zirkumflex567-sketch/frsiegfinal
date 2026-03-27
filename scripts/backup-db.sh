#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$HOME/dev/frsiegv2}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${PROJECT_DIR}/backups"
mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "Missing .env in $PROJECT_DIR"
  exit 1
fi

set -a
source .env
set +a

OUT_FILE="${BACKUP_DIR}/frsiegv2-${STAMP}.sql"

echo "Creating DB backup: $OUT_FILE"
sudo docker compose --env-file .env exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$OUT_FILE"

gzip -f "$OUT_FILE"
echo "Backup done: ${OUT_FILE}.gz"
