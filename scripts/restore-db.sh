#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz|backup.sql> [project_dir]"
  exit 1
fi

BACKUP_FILE="$1"
PROJECT_DIR="${2:-$HOME/dev/frsiegv2}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "Missing .env in $PROJECT_DIR"
  exit 1
fi

set -a
source .env
set +a

echo "Restoring database $POSTGRES_DB from $BACKUP_FILE"

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | sudo docker compose --env-file .env exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
else
  cat "$BACKUP_FILE" | sudo docker compose --env-file .env exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
fi

echo "Restore completed"
