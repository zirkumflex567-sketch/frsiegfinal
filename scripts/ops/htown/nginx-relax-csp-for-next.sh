#!/usr/bin/env bash
set -euo pipefail

CONF_FILE="/etc/nginx/conf.d/000-h-town-force.conf"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_FILE="${CONF_FILE}.bak.csp.${STAMP}"

cp "$CONF_FILE" "$BACKUP_FILE"
echo "Backup written: $BACKUP_FILE"

python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/conf.d/000-h-town-force.conf')
text = p.read_text()
old = "script-src 'self' https://challenges.cloudflare.com;"
new = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;"
if old not in text:
    raise SystemExit('CSP script-src pattern not found; aborting')
p.write_text(text.replace(old, new, 1))
print('CSP updated')
PY

restorecon -v "$CONF_FILE" || true
nginx -t
systemctl reload nginx

echo "CSP relaxed for Next.js inline runtime."
