#!/usr/bin/env bash
set -euo pipefail

CONF="/etc/nginx/conf.d/000-h-town-force.conf"
SITE_DIR="/var/www/h-town-duckdns/fr-sieg"

cd "$SITE_DIR"
cp index.html.bak.1774483626 index.html
chown nginx:nginx index.html
chmod 644 index.html

echo "restored index.html from index.html.bak.1774483626"

python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/conf.d/000-h-town-force.conf')
s = p.read_text()
s = s.replace('location = /fr-sieg { return 301 /fr-sieg/v2/; }', 'location = /fr-sieg { expires 10m; try_files /fr-sieg/index.html =404; }')
s = s.replace('location = /fr-sieg/ { return 301 /fr-sieg/v2/; }', 'location = /fr-sieg/ { expires 10m; try_files /fr-sieg/index.html =404; }')
p.write_text(s)
print('restored /fr-sieg root routing to static index')
PY

nginx -t
systemctl reload nginx

echo "done"
