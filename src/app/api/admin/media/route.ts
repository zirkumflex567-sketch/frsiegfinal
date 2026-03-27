import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createMediaAsset, listMediaAssets } from "@/lib/content/media-repository";
import { saveUploadedFile } from "@/lib/content/media-storage";

const altTextSchema = z.string().trim().max(200).optional();

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const assets = await listMediaAssets();
  const media = assets.map((item) => ({
    ...item,
    fileUrl: `/api/media/${item.id}`,
  }));

  return NextResponse.json({ media });
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const altTextResult = altTextSchema.safeParse(formData.get("altText") ?? undefined);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }

  if (!altTextResult.success) {
    return NextResponse.json({ error: "Alt-Text ist ungültig." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Datei ist leer." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Datei ist zu groß (max 10MB)." },
      { status: 413 },
    );
  }

  const { fileName, storagePath } = await saveUploadedFile(file);
  const asset = await createMediaAsset({
    fileName,
    storagePath,
    fileSizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    altText: altTextResult.data ?? null,
  });

  return NextResponse.json(
    {
      asset: {
        ...asset,
        fileUrl: `/api/media/${asset.id}`,
      },
    },
    { status: 201 },
  );
}
