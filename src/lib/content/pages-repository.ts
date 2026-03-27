import { ensureCoreSchema } from "@/lib/db/bootstrap";
import { getDbPool } from "@/lib/db/pool";
import type { CreatePageInput, PageContent, UpdatePageInput } from "./content-page-schema";

export type ContentPageRecord = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  content: PageContent;
  createdAt: string;
  updatedAt: string;
};

type DbRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  content_json: PageContent;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): ContentPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    content: row.content_json ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listContentPages(): Promise<ContentPageRecord[]> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbRow>(
    "SELECT id, slug, title, status, content_json, created_at, updated_at FROM content_pages ORDER BY updated_at DESC",
  );

  return rows.map(mapRow);
}

export async function getContentPageById(id: string): Promise<ContentPageRecord | null> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbRow>(
    "SELECT id, slug, title, status, content_json, created_at, updated_at FROM content_pages WHERE id = $1 LIMIT 1",
    [id],
  );

  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function getContentPageBySlug(
  slug: string,
  options?: { preferPublished?: boolean },
): Promise<ContentPageRecord | null> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  if (options?.preferPublished) {
    const { rows } = await dbPool.query<DbRow>(
      "SELECT id, slug, title, status, content_json, created_at, updated_at FROM content_pages WHERE slug = $1 AND status = 'published' LIMIT 1",
      [slug],
    );

    const publishedRow = rows[0];
    if (publishedRow) {
      return mapRow(publishedRow);
    }
  }

  const { rows } = await dbPool.query<DbRow>(
    "SELECT id, slug, title, status, content_json, created_at, updated_at FROM content_pages WHERE slug = $1 LIMIT 1",
    [slug],
  );

  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function createContentPage(input: CreatePageInput): Promise<ContentPageRecord> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbRow>(
    "INSERT INTO content_pages (slug, title, status, content_json, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW()) RETURNING id, slug, title, status, content_json, created_at, updated_at",
    [input.slug, input.title, input.status, JSON.stringify(input.content ?? {})],
  );

  return mapRow(rows[0]);
}

export async function updateContentPage(
  id: string,
  input: UpdatePageInput,
): Promise<ContentPageRecord | null> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.slug !== undefined) {
    values.push(input.slug);
    fields.push(`slug = $${values.length}`);
  }

  if (input.title !== undefined) {
    values.push(input.title);
    fields.push(`title = $${values.length}`);
  }

  if (input.status !== undefined) {
    values.push(input.status);
    fields.push(`status = $${values.length}`);
  }

  if (input.content !== undefined) {
    values.push(JSON.stringify(input.content));
    fields.push(`content_json = $${values.length}::jsonb`);
  }

  if (fields.length === 0) {
    return getContentPageById(id);
  }

  values.push(id);
  const idIndex = values.length;

  const { rows } = await dbPool.query<DbRow>(
    `UPDATE content_pages SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idIndex} RETURNING id, slug, title, status, content_json, created_at, updated_at`,
    values,
  );

  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function deleteContentPage(id: string): Promise<boolean> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const result = await dbPool.query("DELETE FROM content_pages WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
