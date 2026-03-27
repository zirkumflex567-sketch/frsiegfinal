import { ensureCoreSchema } from "@/lib/db/bootstrap";
import { getDbPool } from "@/lib/db/pool";

export type MediaAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  altText: string | null;
  createdAt: string;
};

type DbMediaRow = {
  id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  alt_text: string | null;
  created_at: string;
};

function mapMediaRow(row: DbMediaRow): MediaAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    storagePath: row.storage_path,
    altText: row.alt_text,
    createdAt: row.created_at,
  };
}

export async function listMediaAssets(): Promise<MediaAsset[]> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbMediaRow>(
    "SELECT id, file_name, mime_type, file_size_bytes, storage_path, alt_text, created_at FROM media_assets ORDER BY created_at DESC",
  );

  return rows.map(mapMediaRow);
}

export async function createMediaAsset(input: {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  altText?: string | null;
}): Promise<MediaAsset> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbMediaRow>(
    "INSERT INTO media_assets (file_name, mime_type, file_size_bytes, storage_path, alt_text) VALUES ($1, $2, $3, $4, $5) RETURNING id, file_name, mime_type, file_size_bytes, storage_path, alt_text, created_at",
    [input.fileName, input.mimeType, input.fileSizeBytes, input.storagePath, input.altText ?? null],
  );

  return mapMediaRow(rows[0]);
}

export async function getMediaAssetById(id: string): Promise<MediaAsset | null> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbMediaRow>(
    "SELECT id, file_name, mime_type, file_size_bytes, storage_path, alt_text, created_at FROM media_assets WHERE id = $1 LIMIT 1",
    [id],
  );

  const row = rows[0];
  return row ? mapMediaRow(row) : null;
}

export async function deleteMediaAssetById(id: string): Promise<MediaAsset | null> {
  await ensureCoreSchema();
  const dbPool = getDbPool();

  const { rows } = await dbPool.query<DbMediaRow>(
    "DELETE FROM media_assets WHERE id = $1 RETURNING id, file_name, mime_type, file_size_bytes, storage_path, alt_text, created_at",
    [id],
  );

  const row = rows[0];
  return row ? mapMediaRow(row) : null;
}
