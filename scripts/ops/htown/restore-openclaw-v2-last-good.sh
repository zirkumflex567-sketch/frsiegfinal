#!/usr/bin/env bash
set -euo pipefail

SRC_I="/home/kevin/devclaw/tmp_v2_index.html"
SRC_C="/home/kevin/devclaw/tmp_v2_styles.css"
DST_DIR="/var/www/h-town-duckdns/fr-sieg/v2"
CONF="/etc/nginx/conf.d/000-h-town-force.conf"
TS=$(date +%Y%m%d%H%M%S)

cp "$DST_DIR/index.html" "$DST_DIR/index.html.bak.pre-openclaw-restore.$TS"
cp "$DST_DIR/styles.css" "$DST_DIR/styles.css.bak.pre-openclaw-restore.$TS"

cp "$SRC_I" "$DST_DIR/index.html"
cp "$SRC_C" "$DST_DIR/styles.css"

chown nginx:nginx "$DST_DIR/index.html" "$DST_DIR/styles.css"
chmod 644 "$DST_DIR/index.html" "$DST_DIR/styles.css"

python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/conf.d/000-h-town-force.conf')
s = p.read_text()
s = s.replace('location = /fr-sieg { expires 10m; try_files /fr-sieg/index.html =404; }', 'location = /fr-sieg { return 301 /fr-sieg/v2/; }')
s = s.replace('location = /fr-sieg/ { expires 10m; try_files /fr-sieg/index.html =404; }', 'location = /fr-sieg/ { return 301 /fr-sieg/v2/; }')
p.write_text(s)
print('nginx root -> /fr-sieg/v2/ enabled')
PY

nginx -t
systemctl reload nginx

echo "restore-openclaw-v2-last-good complete"
