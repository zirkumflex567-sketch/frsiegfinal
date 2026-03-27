# Worklog

## 2026-03-27

- Admin Auth stabilisiert (Login/Logout/Session)
- Content CRUD für Seiten implementiert (`/api/admin/pages`)
- Oma-Modus Seitenverwaltung ausgebaut (Hero, Farben, Panels, Partner)
- Medienbibliothek ergänzt (`/api/admin/media`, Upload/Delete)
- Öffentliche Medienroute ergänzt (`/api/media/[assetId]`)
- Live-Editor auf Startseite integriert (`/?edit=1`)
- Upload-Persistenz in Docker über `app_uploads` Volume ergänzt
- Backup/Restore Skripte und Deploy-Dokumentation erstellt

## 2026-03-26

- Next.js Projekt auf `htown` erstellt: `/home/kevin/dev/frsiegv2`
- Docker Compose Basis (`app` + `db`) erstellt
- Dockerfile für Next.js standalone Build erstellt
- `.env.example` erstellt
- `next.config.ts` auf `output: "standalone"` gesetzt
