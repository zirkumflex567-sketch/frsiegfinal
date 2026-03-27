#!/usr/bin/env bash
set -euo pipefail

CONF_FILE="/etc/nginx/conf.d/000-h-town-force.conf"
LATEST_BACKUP="$(ls -1t /etc/nginx/conf.d/000-h-town-force.conf.bak.cutover.* 2>/dev/null | head -n 1 || true)"

if [[ -z "$LATEST_BACKUP" ]]; then
  echo "No cutover backup found."
  exit 1
fi

cp "$LATEST_BACKUP" "$CONF_FILE"
restorecon -v "$CONF_FILE" || true
nginx -t
systemctl reload nginx

echo "Rolled back to: $LATEST_BACKUP"
