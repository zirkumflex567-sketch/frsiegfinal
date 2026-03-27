import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function getUploadDirectory() {
  return process.env.MEDIA_UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
}

export async function saveUploadedFile(file: File): Promise<{ fileName: string; storagePath: string }> {
  const uploadDir = getUploadDirectory();
  await mkdir(uploadDir, { recursive: true });

  const originalName = file.name || "upload.bin";
  const ext = path.extname(originalName).slice(0, 16);
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "");
  const fileName = `${Date.now()}-${randomUUID()}${safeExt || ""}`;
  const storagePath = path.join(uploadDir, fileName);

  const bytes = await file.arrayBuffer();
  await writeFile(storagePath, Buffer.from(bytes));

  return { fileName, storagePath };
}

export async function deleteStoredFile(storagePath: string) {
  try {
    await unlink(storagePath);
  } catch {
    // ignore missing files
  }
}
