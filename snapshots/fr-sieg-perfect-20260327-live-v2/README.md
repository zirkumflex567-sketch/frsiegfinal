# FR-Sieg Perfect Snapshot (2026-03-27)

This folder is a byte-for-byte export of the live static deployment state that was confirmed as the correct pre-CMS design.

## Source of truth (live at capture time)
- `/var/www/h-town-duckdns/fr-sieg/v2/index.html`
- `/var/www/h-town-duckdns/fr-sieg/v2/styles.css`
- `/etc/nginx/conf.d/000-h-town-force.conf`

## Captured at
- Date: 2026-03-27
- Context: user-confirmed "perfekter Stand"

## Restore (manual)
1. Copy `index.html` and `styles.css` to `/var/www/h-town-duckdns/fr-sieg/v2/`
2. Ensure ownership/permissions: `nginx:nginx`, mode `644`
3. Ensure nginx route for `/fr-sieg/` points to `/fr-sieg/v2/`
4. `nginx -t && systemctl reload nginx`

## Notes
- This snapshot is intentionally static and CMS-independent.
- Do not edit files in this folder if you want an immutable rollback point.
