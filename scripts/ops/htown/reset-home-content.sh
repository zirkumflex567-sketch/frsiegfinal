#!/usr/bin/env bash
set -euo pipefail

if [ -d "/home/kevin/dev/frsiegv2" ]; then
  cd /home/kevin/dev/frsiegv2
elif [ -d "/root/dev/frsiegv2" ]; then
  cd /root/dev/frsiegv2
else
  echo "project path not found"
  exit 1
fi

SQL_FILE="/tmp/frsieg-reset-home-$(date +%s).sql"
cat > "$SQL_FILE" <<'SQL'
UPDATE content_pages
SET
  title = 'Startseite',
  status = 'published',
  content_json = jsonb_build_object(
    'hero', jsonb_build_object(
      'heading', 'Willkommen bei FR-Sieg',
      'subheading', 'Wir verbinden Partner, Projekte und Menschen mit klaren Inhalten.',
      'ctaLabel', 'Kontakt',
      'ctaHref', '/kontakt',
      'backgroundAssetId', null
    ),
    'colors', jsonb_build_object(
      'primary', '#2563eb',
      'surface', '#f5f5f5',
      'heading', '#1f2937',
      'body', '#374151'
    ),
    'typography', jsonb_build_object(
      'fontFamily', 'Inter, system-ui, sans-serif',
      'headingWeight', '700',
      'bodyWeight', '400'
    ),
    'links', jsonb_build_object(
      'primaryCta', '/kontakt'
    ),
    'panels', jsonb_build_array(
      jsonb_build_object(
        'id', 'panel-1',
        'title', 'Unsere Mission',
        'text', 'Klare Kommunikation und verlässliche Partnerschaften.',
        'color', '#2563eb',
        'linkLabel', 'Mehr lesen',
        'linkHref', '/ueber-uns',
        'imageAssetId', null
      )
    ),
    'partners', jsonb_build_array(
      jsonb_build_object(
        'id', 'partner-1',
        'name', 'Ihr Partnername',
        'url', 'https://example.com',
        'logoAssetId', null
      )
    )
  )::jsonb,
  updated_at = NOW()
WHERE slug = 'home';

INSERT INTO content_pages (slug, title, status, content_json, updated_at)
SELECT
  'home',
  'Startseite',
  'published',
  jsonb_build_object(
    'hero', jsonb_build_object(
      'heading', 'Willkommen bei FR-Sieg',
      'subheading', 'Wir verbinden Partner, Projekte und Menschen mit klaren Inhalten.',
      'ctaLabel', 'Kontakt',
      'ctaHref', '/kontakt',
      'backgroundAssetId', null
    ),
    'colors', jsonb_build_object(
      'primary', '#2563eb',
      'surface', '#f5f5f5',
      'heading', '#1f2937',
      'body', '#374151'
    ),
    'typography', jsonb_build_object(
      'fontFamily', 'Inter, system-ui, sans-serif',
      'headingWeight', '700',
      'bodyWeight', '400'
    ),
    'links', jsonb_build_object(
      'primaryCta', '/kontakt'
    ),
    'panels', jsonb_build_array(
      jsonb_build_object(
        'id', 'panel-1',
        'title', 'Unsere Mission',
        'text', 'Klare Kommunikation und verlässliche Partnerschaften.',
        'color', '#2563eb',
        'linkLabel', 'Mehr lesen',
        'linkHref', '/ueber-uns',
        'imageAssetId', null
      )
    ),
    'partners', jsonb_build_array(
      jsonb_build_object(
        'id', 'partner-1',
        'name', 'Ihr Partnername',
        'url', 'https://example.com',
        'logoAssetId', null
      )
    )
  )::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM content_pages WHERE slug = 'home');

SELECT slug, title, status, content_json->'hero'->>'heading' AS hero_heading
FROM content_pages
WHERE slug = 'home';
SQL

DB_USER="${POSTGRES_USER:-frsieg}"
DB_NAME="${POSTGRES_DB:-frsiegv2}"

sudo docker exec -i frsiegv2-db psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
rm -f "$SQL_FILE"

echo "home content reset complete"
