# frsiegv2

Neue FR-Sieg v2 Website mit self-hosted **Oma-Modus CMS**.

## Ziel

- Bestehende v2 als neue Basis für `fr-sieg.de`
- Einfaches CMS mit Login, Live-Bearbeitung und Bildupload
- Betrieb vollständig self-hosted auf htown VPS (Docker Compose + PostgreSQL)

## Aktueller Stand (Foundation S01)

- [x] Next.js 16 + Docker Compose (`app` + `db`)
- [x] Public Homepage (`/`) ist request-time CMS-backed (`home`) mit stabilem Fallback bei Content/DB-Fehlern
- [x] Admin Login mit Session-Cookie
- [x] Content-Model für Seiten (`hero`, `colors`, `panels`, `partners`, `links`)
- [x] Admin CRUD APIs für Seiten (`/api/admin/pages`)
- [x] Medien-Upload + Verwaltung (`/api/admin/media`)
- [x] Live-Editor auf Startseite (`/?edit=1` als Admin)
- [x] Backup/Restore Skripte

## Quickstart lokal

```bash
npm install
npm test
npm run build
npm run dev
```

App danach unter: `http://localhost:3000`

Optionaler Live-CMS Smoke (laufender lokaler Server nötig):

```bash
FRSIEG_BASE_URL=http://localhost:3000 FRSIEG_PATH_PREFIX= npm run e2e:live
```

## Start auf htown

```bash
cd ~/dev/frsiegv2
cp .env.example .env
# sichere Werte setzen
sudo docker compose --env-file .env up -d --build
```

Danach: `http://<htown-ip>:3000`

## Wichtigste Pfade

- `src/app/admin/*` – Admin UI
- `src/app/api/admin/pages/*` – Seiten CRUD
- `src/app/api/admin/media/*` – Medien Upload/Delete
- `src/app/api/media/[assetId]/route.ts` – öffentliche Auslieferung von Medien
- `src/app/page.tsx` + `src/app/home-live-page.tsx` – öffentliche Seite + Live-Editor
- `src/lib/content/*` – Content-/Media-Modelle + Repositories
- `vitest.config.ts` – Test-Scope (ohne Build-Artefakte)
- `docs/DEPLOY-HTOWN.md` – Deploy Doku
- `docs/CMS-OMA-MODUS.md` – Bedienung
- `scripts/backup-db.sh`, `scripts/restore-db.sh` – Betrieb
- `scripts/ops/run-on-htown.sh` – sichere Remote-Ausführung ohne Quoting-Chaos
- `scripts/ops/htown/nginx-cutover-frsieg.sh` – idempotenter FR-Sieg Cutover
- `scripts/ops/htown/nginx-rollback-cutover.sh` – schneller Nginx Rollback

## Nächste Schritte (Feinschliff)

1. Bestehende v2-Inhalte vollständig migrieren
2. Weitere Unterseiten als Content-Seiten anlegen
3. Nginx + TLS final auf `fr-sieg.de` umschalten
4. Optional: tägliches Cron-Backup
