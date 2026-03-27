#!/usr/bin/env bash
set -euo pipefail

CONF="/etc/nginx/conf.d/000-h-town-force.conf"
cp "$CONF" "${CONF}.bak.pre-v2-redirect.$(date +%Y%m%d%H%M%S)"

python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/conf.d/000-h-town-force.conf')
s = p.read_text()

s = s.replace(
    'location = /fr-sieg { expires 10m; try_files /fr-sieg/index.html =404; }',
    'location = /fr-sieg { return 301 /fr-sieg/v2/; }',
)
s = s.replace(
    'location = /fr-sieg/ { expires 10m; try_files /fr-sieg/index.html =404; }',
    'location = /fr-sieg/ { return 301 /fr-sieg/v2/; }',
)

p.write_text(s)
print('updated /fr-sieg and /fr-sieg/ to v2 redirect')
PY

nginx -t
systemctl reload nginx

echo "nginx reloaded"
