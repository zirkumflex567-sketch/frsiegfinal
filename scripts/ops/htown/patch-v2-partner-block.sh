#!/usr/bin/env bash
set -euo pipefail

FILE="/var/www/h-town-duckdns/fr-sieg/v2/index.html"

python3 - <<'PY'
from pathlib import Path

p = Path('/var/www/h-town-duckdns/fr-sieg/v2/index.html')
s = p.read_text(encoding='utf-8')

if 'class="partner-block"' in s:
    print('partner block already present')
    raise SystemExit(0)

anchor = '          <p class="map-link"><a href="https://www.google.com/maps/search/?api=1&query=Waldstra%C3%9Fe+10%2C+67454+Ha%C3%9Floch" target="_blank" rel="noopener noreferrer">Standort in Google Maps öffnen</a></p>'
block = '\n'.join([
    anchor,
    '          <div class="partner-block">',
    '            <h3>Unsere Partner</h3>',
    '            <img src="/fr-sieg/assets/partner-neher-from-screenshot.png" alt="Partnerlogo" width="110" height="120" loading="lazy" />',
    '          </div>'
])

if anchor not in s:
    raise SystemExit('anchor not found in v2/index.html')

s = s.replace(anchor, block, 1)
p.write_text(s, encoding='utf-8')
print('patched v2/index.html')
PY

# append css rules once
CSS="/var/www/h-town-duckdns/fr-sieg/v2/styles.css"
if ! grep -q "partner-block" "$CSS"; then
  cat >> "$CSS" <<'CSS'

.partner-block {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
}

.partner-block h3 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.partner-block img {
  display: block;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
}
CSS
  echo "patched v2/styles.css"
else
  echo "partner css already present"
fi

echo "done"
