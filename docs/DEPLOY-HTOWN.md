# Deploy auf htown VPS

## 1) Voraussetzungen
- SSH Zugriff auf `htown`
- Docker + Docker Compose installiert
- Projekt liegt in `~/dev/frsiegv2`

## 2) Environment

```bash
cd ~/dev/frsiegv2
cp .env.example .env
# Werte setzen: POSTGRES_PASSWORD, NEXTAUTH_SECRET, ADMIN_PASSWORD
```

Wichtige Variablen:
- `NEXTAUTH_URL=https://fr-sieg.de`
- `MEDIA_UPLOAD_DIR=/app/data/uploads`

## 3) Start / Update

```bash
cd ~/dev/frsiegv2
sudo docker compose --env-file .env up -d --build
sudo docker compose --env-file .env ps
```

## 4) Smoke Checks

```bash
curl -sS http://localhost:3000/api/health
curl -sS http://localhost:3000/
```

Erwartung:
- Health: `{"ok":true,...}`
- Homepage lädt

## 5) Reverse Proxy (Nginx)

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

## 6) Backups

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

## 7) Update Rollback

- Vor Deploy Backup ausführen
- Bei Problemen letzten Commit checkouten und neu bauen:

```bash
git checkout <last-good-commit>
sudo docker compose --env-file .env up -d --build
```
