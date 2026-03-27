#!/usr/bin/env bash
set -euo pipefail

CONF_FILE="/etc/nginx/conf.d/000-h-town-force.conf"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_FILE="${CONF_FILE}.bak.cutover.${STAMP}"

if [[ ! -f "$CONF_FILE" ]]; then
  echo "Nginx conf not found: $CONF_FILE"
  exit 1
fi

cp "$CONF_FILE" "$BACKUP_FILE"
echo "Backup written: $BACKUP_FILE"

python3 - <<'PY'
from pathlib import Path

conf = Path('/etc/nginx/conf.d/000-h-town-force.conf')
text = conf.read_text()

begin = '  # BEGIN FRSIEG_CUTOVER\n'
end = '  # END FRSIEG_CUTOVER\n'
block = (
    begin
    + '  # FR-Sieg cutover: serve FR-Sieg via Next.js app on :3000\n'
    + '  location = /fr-sieg { return 301 /fr-sieg/; }\n'
    + '  location = /fr-sieg/v2 { return 301 /fr-sieg/; }\n'
    + '  location = /fr-sieg/v2/ { return 301 /fr-sieg/; }\n\n'
    + '  # Next.js assets + APIs needed by app rendered under /fr-sieg\n'
    + '  location ^~ /_next/ {\n'
    + '    proxy_pass http://127.0.0.1:3000;\n'
    + '    proxy_http_version 1.1;\n'
    + '    proxy_set_header Host $host;\n'
    + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
    + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
    + '    proxy_set_header X-Real-IP $remote_addr;\n'
    + '    proxy_set_header Upgrade $http_upgrade;\n'
    + '    proxy_set_header Connection "upgrade";\n'
    + '    proxy_buffering off;\n'
    + '  }\n\n'
    + '  location ^~ /api/admin/ {\n'
    + '    proxy_pass http://127.0.0.1:3000;\n'
    + '    proxy_http_version 1.1;\n'
    + '    proxy_set_header Host $host;\n'
    + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
    + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
    + '    proxy_set_header X-Real-IP $remote_addr;\n'
    + '    proxy_set_header Upgrade $http_upgrade;\n'
    + '    proxy_set_header Connection "upgrade";\n'
    + '    proxy_buffering off;\n'
    + '  }\n\n'
    + '  location ^~ /api/media/ {\n'
    + '    proxy_pass http://127.0.0.1:3000;\n'
    + '    proxy_http_version 1.1;\n'
    + '    proxy_set_header Host $host;\n'
    + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
    + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
    + '    proxy_set_header X-Real-IP $remote_addr;\n'
    + '    proxy_set_header Upgrade $http_upgrade;\n'
    + '    proxy_set_header Connection "upgrade";\n'
    + '    proxy_buffering off;\n'
    + '  }\n\n'
    + '  location ^~ /admin/ {\n'
    + '    proxy_pass http://127.0.0.1:3000;\n'
    + '    proxy_http_version 1.1;\n'
    + '    proxy_set_header Host $host;\n'
    + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
    + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
    + '    proxy_set_header X-Real-IP $remote_addr;\n'
    + '    proxy_set_header Upgrade $http_upgrade;\n'
    + '    proxy_set_header Connection "upgrade";\n'
    + '    proxy_buffering off;\n'
    + '  }\n\n'
    + '  location = /admin {\n'
    + '    proxy_pass http://127.0.0.1:3000;\n'
    + '    proxy_http_version 1.1;\n'
    + '    proxy_set_header Host $host;\n'
    + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
    + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
    + '    proxy_set_header X-Real-IP $remote_addr;\n'
    + '    proxy_set_header Upgrade $http_upgrade;\n'
    + '    proxy_set_header Connection "upgrade";\n'
    + '    proxy_buffering off;\n'
    + '  }\n\n'
    + '  location ^~ /fr-sieg/ {\n'
    + '    rewrite ^/fr-sieg/?(.*)$ /$1 break;\n'
    + '    proxy_pass http://127.0.0.1:3000;\n'
    + '    proxy_http_version 1.1;\n'
    + '    proxy_set_header Host $host;\n'
    + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
    + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
    + '    proxy_set_header X-Real-IP $remote_addr;\n'
    + '    proxy_set_header Upgrade $http_upgrade;\n'
    + '    proxy_set_header Connection "upgrade";\n'
    + '    proxy_buffering off;\n'
    + '  }\n'
    + end
)

if begin in text and end in text:
    start = text.index(begin)
    finish = text.index(end) + len(end)
    new_text = text[:start] + block + text[finish:]
else:
    anchor = '  location = /playmobil { return 301 /playmobil/; }\n'
    legacy = '  # FR-Sieg cutover: serve FR-Sieg via Next.js app on :3000\n'

    if legacy in text and anchor in text and text.index(legacy) < text.index(anchor):
        start = text.index(legacy)
        finish = text.index(anchor)
        new_text = text[:start] + block + '\n' + text[finish:]
    else:
        if anchor not in text:
            raise SystemExit('Anchor not found. Refusing to patch automatically.')
        new_text = text.replace(anchor, block + '\n' + anchor, 1)

conf.write_text(new_text)
print('Cutover block applied')
PY

restorecon -v "$CONF_FILE" || true

if nginx -t; then
  systemctl reload nginx
  echo "Nginx reloaded successfully."
else
  echo "nginx -t failed, rolling back..."
  cp "$BACKUP_FILE" "$CONF_FILE"
  restorecon -v "$CONF_FILE" || true
  nginx -t
  systemctl reload nginx
  echo "Rollback complete."
  exit 1
fi

echo "Smoke check:"
curl -sSI https://h-town.duckdns.org/fr-sieg/ | head -n 5
