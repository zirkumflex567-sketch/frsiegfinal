# Deploy auf htown VPS

## 1) Voraussetzungen
- SSH Zugriff auf `htown`
- Docker + Docker Compose installiert
- Projekt liegt in `~/dev/frsiegv2`

## 2) Foundation Inventory (S01)

Der aktuelle Foundation-Stand, auf den sich Deploy/Smoke stützen:
- Public Homepage (`/`) rendert request-time CMS-Content (`home`) mit sicherem Fallback bei DB/Content-Fehlern
- Live-Editor bleibt über `/?edit=1` für Admin-Session nutzbar
- Admin Login + Session-Cookie funktionieren
- Admin CRUD APIs für Seiten (`/api/admin/pages`)
- Medien Upload/Verwaltung (`/api/admin/media`) + öffentliche Auslieferung (`/api/media/[assetId]`)
- Live-CMS Smoke-Script mit JSON-Evidence (`scripts/e2e/live-cms-visible.cjs`)

## 3) Environment

```bash
cd ~/dev/frsiegv2
cp .env.example .env
# Werte setzen: POSTGRES_PASSWORD, NEXTAUTH_SECRET, ADMIN_PASSWORD
```

Wichtige Variablen:
- `NEXTAUTH_URL=https://fr-sieg.de`
- `MEDIA_UPLOAD_DIR=/app/data/uploads`

## 4) Start / Update

```bash
cd ~/dev/frsiegv2
sudo docker compose --env-file .env up -d --build
sudo docker compose --env-file .env ps
```

## 5) Verifikation (lokal vor Deploy)

```bash
cd /c/Users/zirku/Documents/frsiegv2
npm test
npm run build
```

Optionaler Live-CMS Smoke gegen lokalen Server:

```bash
cd /c/Users/zirku/Documents/frsiegv2
FRSIEG_BASE_URL=http://localhost:3000 FRSIEG_PATH_PREFIX= npm run e2e:live
```

## 6) Verifikation auf htown

```bash
cd ~/dev/frsiegv2
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:3000/
```

Erwartung:
- Health enthält `"ok":true`
- Homepage lädt (auch wenn CMS-Inhalt temporär ausfällt, bleibt ein stabiler Fallback sichtbar)

## 7) Reverse Proxy (Nginx)

- Domain `fr-sieg.de` auf VPS zeigen lassen
- Nginx auf `http://127.0.0.1:3000` proxyen
- TLS via Let's Encrypt

### Sicherer Cutover-Workflow (ohne fragile SSH-One-Liner)

Von deinem lokalen Repo (Git Bash/WSL):

```bash
cd /c/Users/zirku/Documents/frsiegv2
bash scripts/ops/run-on-htown.sh --sudo scripts/ops/htown/nginx-cutover-frsieg.sh
```

Rollback (falls nötig):

```bash
cd /c/Users/zirku/Documents/frsiegv2
bash scripts/ops/run-on-htown.sh --sudo scripts/ops/htown/nginx-rollback-cutover.sh
```

Was der Cutover automatisch macht:
- Backup der Nginx-Datei (`.bak.cutover.<timestamp>`)
- idempotentes Einfügen/Aktualisieren des FRSIEG-Cutover-Blocks
- `nginx -t` vor Reload
- Auto-Rollback bei Fehlern
- SELinux-Kontext-Fix (`restorecon`)

## 8) Backups

DB Backup:

```bash
cd ~/dev/frsiegv2
bash scripts/backup-db.sh
```

Restore:

```bash
cd ~/dev/frsiegv2
bash scripts/restore-db.sh backups/frsiegv2-YYYYMMDD-HHMMSS.sql.gz
```

## 9) Update Rollback

- Vor Deploy Backup ausführen
- Bei Problemen letzten Commit checkouten und neu bauen:

```bash
git checkout <last-good-commit>
sudo docker compose --env-file .env up -d --build
```
