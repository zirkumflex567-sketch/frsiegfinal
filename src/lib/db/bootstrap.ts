import { getDbPool } from "./pool";
import { hashPassword } from "@/lib/auth/password";

let initializationPromise: Promise<void> | null = null;

export async function ensureCoreSchema() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const dbPool = getDbPool();

    await dbPool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

    await dbPool.query(
      "CREATE TABLE IF NOT EXISTS admin_users (" +
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), " +
        "email TEXT NOT NULL UNIQUE, " +
        "password_hash TEXT NOT NULL, " +
        "role TEXT NOT NULL DEFAULT 'admin', " +
        "is_active BOOLEAN NOT NULL DEFAULT TRUE, " +
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
        "last_login_at TIMESTAMPTZ" +
        ");",
    );

    await dbPool.query(
      "CREATE TABLE IF NOT EXISTS content_pages (" +
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), " +
        "slug TEXT NOT NULL UNIQUE, " +
        "title TEXT NOT NULL, " +
        "status TEXT NOT NULL DEFAULT 'draft', " +
        "content_json JSONB NOT NULL DEFAULT '{}'::jsonb, " +
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" +
        ");",
    );

    await dbPool.query(
      "CREATE TABLE IF NOT EXISTS media_assets (" +
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid(), " +
        "file_name TEXT NOT NULL, " +
        "mime_type TEXT NOT NULL, " +
        "file_size_bytes BIGINT NOT NULL, " +
        "storage_path TEXT NOT NULL, " +
        "alt_text TEXT, " +
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" +
        ");",
    );

    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@fr-sieg.de";
    const adminPassword = process.env.ADMIN_PASSWORD;

    const { rows } = await dbPool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM admin_users",
    );

    const hasAnyUser = Number(rows[0]?.count ?? "0") > 0;

    if (!hasAnyUser && adminPassword) {
      const passwordHash = await hashPassword(adminPassword);

      await dbPool.query(
        "INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING",
        [adminEmail.toLowerCase(), passwordHash],
      );
    }

    const homePageCheck = await dbPool.query<{ id: string }>(
      "SELECT id FROM content_pages WHERE slug = 'home' LIMIT 1",
    );

    const hasHomePage = homePageCheck.rows.length > 0;

    if (!hasHomePage) {
      await dbPool.query(
        "INSERT INTO content_pages (slug, title, status, content_json, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW())",
        [
          "home",
          "Startseite",
          "published",
          JSON.stringify({
            hero: {
              heading: "Willkommen bei FR-Sieg",
              subheading:
                "Wir verbinden Partner, Projekte und Menschen mit klaren Inhalten.",
              ctaLabel: "Kontakt",
              ctaHref: "/kontakt",
              backgroundAssetId: null,
            },
            colors: {
              primary: "#2563eb",
              surface: "#f5f5f5",
              heading: "#1f2937",
              body: "#374151",
            },
            typography: {
              fontFamily: "Inter, system-ui, sans-serif",
              headingWeight: "700",
              bodyWeight: "400",
            },
            links: {
              primaryCta: "/kontakt",
            },
            panels: [
              {
                id: "panel-1",
                title: "Unsere Mission",
                text: "Klare Kommunikation und verlässliche Partnerschaften.",
                color: "#2563eb",
                linkLabel: "Mehr lesen",
                linkHref: "/ueber-uns",
                imageAssetId: null,
              },
            ],
            partners: [
              {
                id: "partner-1",
                name: "Ihr Partnername",
                url: "https://example.com",
                logoAssetId: null,
              },
            ],
          }),
        ],
      );
    }
  })();

  return initializationPromise;
}
