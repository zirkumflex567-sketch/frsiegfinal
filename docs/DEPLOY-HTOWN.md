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

### Kanonischer S04-Cutover-Rehearsal-Workflow

Von deinem lokalen Repo (Git Bash/WSL):

```bash
cd /c/Users/zirku/Documents/frsiegv2
FRSIEG_BASE_URL=https://h-town.duckdns.org \
FRSIEG_PATH_PREFIX=/fr-sieg \
bash scripts/ops/htown/cutover-rehearsal.sh
```

Preflight/Dry-Run (ohne Eingriff):

```bash
cd /c/Users/zirku/Documents/frsiegv2
FRSIEG_BASE_URL=https://h-town.duckdns.org bash scripts/ops/htown/cutover-rehearsal.sh --dry-run
```

Der Rehearsal-Workflow ist die kanonische Kommando-Route für S04 (Preflight → Cutover → `/api/health` → `npm run e2e:live` → Entscheidung).

#### Objektive Go/No-Go Kriterien

`cutover-rehearsal.sh` emittiert pro Phase maschinenlesbare Zeilen (`phase=<...> status=<...>`).

**Go nur wenn alle Gates erfüllt sind:**
- Health-Gate: `phase=health status=ok ... ok=true` (aus `/api/health`)
- Smoke-Gate: `phase=smoke status=ok ...` und JSON-Evidence enthält mindestens:
  - `ok:true`
  - `step`
  - `action`
  - `endpoint`
  - `artifactPath` (Screenshot/Beweis unter `.gsd/...`)
- Abschluss: `phase=decision status=go reason=all_gates_passed`

**No-Go bei jedem Fehler/Timeout/Malformed Contract:**
- `phase=cutover status=error ...`
- `phase=health status=error ...` (inkl. Timeout/invalid JSON/unhealthy)
- `phase=smoke status=error ...` (inkl. timeout/command failure/malformed payload/proof failed)
- Abschluss: `phase=decision status=no-go ...`

Rollback-Kommando (manuell):

```bash
cd /c/Users/zirku/Documents/frsiegv2
bash scripts/ops/run-on-htown.sh --sudo scripts/ops/htown/nginx-rollback-cutover.sh
```

Optional kann Rollback automatisch ausgeführt werden:

```bash
AUTO_ROLLBACK=true FRSIEG_BASE_URL=https://h-town.duckdns.org bash scripts/ops/htown/cutover-rehearsal.sh
```

#### Legacy Helper (nicht kanonisch)

Die folgenden Befehle bleiben als Low-Level-Helfer erhalten, sind aber nicht der primäre S04-Weg:
- `bash scripts/ops/run-on-htown.sh --sudo scripts/ops/htown/nginx-cutover-frsieg.sh`
- `bash scripts/ops/run-on-htown.sh --sudo scripts/ops/htown/nginx-rollback-cutover.sh`

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
