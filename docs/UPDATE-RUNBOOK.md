# FR-Sieg Update Runbook

Diese Datei ist die zentrale Anleitung, um `fr-sieg.de` technisch und inhaltlich sauber zu betreiben.

## Zielbild (SEO-sauber)

- Hauptdomain: `https://fr-sieg.de/` (liefert `200`)
- Varianten mit `301` auf Hauptdomain:
  - `http://fr-sieg.de`
  - `https://www.fr-sieg.de`
  - `https://wp.fr-sieg.de`
- `robots.txt` und `sitemap.xml` direkt auf `fr-sieg.de` erreichbar

## Aktueller Hosting-Stand (2026-04-23)

- Domain liegt in Plesk (`plesk.ecos.net`)
- Webroot für ausgelieferten Inhalt: `wp.fr-sieg.de` (unter dem Subscription-Root)
- FTP-Benutzer: Subscription-Systemuser (in Plesk unter Hosting-Einstellungen sichtbar)
- Live-Inhalt wurde von `https://h-town.duckdns.org/fr-sieg/v2/` gespiegelt und auf Plesk ausgeliefert

Wichtig: Keine Zugangsdaten im Repo speichern. Zugangsdaten nach Änderungen rotieren.

## Zwei Update-Arten

1. Content-Update (Texte/Bilder/Seiteninhalte)
2. Code-Update (Styles, JS, Komponenten, Build-Verhalten)

## Content-Update (schnell)

1. Änderungen lokal im Projekt umsetzen.
2. Lokal prüfen:
   - Startseite
   - Unterseiten
   - Bilder/Video laden korrekt
3. Sicherstellen:
   - `title` und `meta description` sind sinnvoll
   - `canonical` zeigt auf `https://fr-sieg.de/...`
4. Deploy auf Plesk (siehe Abschnitt "Deploy nach Plesk").

## Code-Update (sauberer Ablauf)

1. Branch erstellen:
   - `git checkout -b feat/<kurzer-name>`
2. Änderungen entwickeln.
3. Lokal prüfen:
   - `npm install`
   - `npm test`
   - `npm run build`
4. Optional lokal im Container testen (siehe `docs/DEPLOY-HTOWN.md`).
5. Commit + PR.
6. Nach Freigabe mergen.
7. Deploy nach Plesk.

## Deploy nach Plesk (Datei-basiert)

Empfohlenes Vorgehen:

1. Export/Build-Artefakte vorbereiten (statische Dateien).
2. Über FTPS in den Plesk-Webroot deployen (`/wp.fr-sieg.de`).
3. Sicherstellen, dass folgende Dateien vorhanden sind:
   - `index.html`
   - `robots.txt`
   - `sitemap.xml`
   - Assets-Ordner (`/fr-sieg/...`)
4. Falls Host-Kanonisierung nötig, `.htaccess` im Webroot setzen (Apache-Regeln).

Beispiel für Host-Kanonisierung:

```apache
RewriteEngine On

RewriteCond %{HTTP_HOST} ^www\.fr-sieg\.de$ [NC,OR]
RewriteCond %{HTTP_HOST} ^wp\.fr-sieg\.de$ [NC]
RewriteRule ^ https://fr-sieg.de%{REQUEST_URI} [R=301,L]
```

## SEO-Checkliste nach jedem Deploy

1. Statuscodes prüfen:
   - `https://fr-sieg.de/` -> `200`
   - `https://www.fr-sieg.de/` -> `301` zu `https://fr-sieg.de/`
   - `https://wp.fr-sieg.de/` -> `301` zu `https://fr-sieg.de/`
2. Seite prüfen:
   - `title`
   - `meta description`
   - `link rel="canonical"`
   - strukturierte Daten (`application/ld+json`)
3. Crawl-Artefakte:
   - `https://fr-sieg.de/robots.txt` -> `200`
   - `https://fr-sieg.de/sitemap.xml` -> `200`

## Google Search Console Ablauf

Nach inhaltlich wichtigen Änderungen:

1. Property `https://fr-sieg.de` öffnen.
2. URL-Prüfung auf Startseite und wichtige Unterseiten.
3. "Indexierung beantragen".
4. Unter "Sitemaps" neu einreichen:
   - `https://fr-sieg.de/sitemap.xml`

## Betriebsregeln

- Keine finalen SEO-Redirects auf externe Domains (z. B. DuckDNS) als Dauerlösung.
- Immer eine kanonische Hauptdomain.
- Keine Credentials im Repo (`.env`, JSON-Creds, Passwörter).
- Nach Notfall-Deploy immer Runbook und `docs/WORKLOG.md` aktualisieren.

## Änderungsprotokoll

- 2026-04-23: SEO-Cutover live gesetzt (`fr-sieg.de` als kanonische Domain, Inhalt direkt ausgeliefert, `robots.txt` + `sitemap.xml` aktiv).
