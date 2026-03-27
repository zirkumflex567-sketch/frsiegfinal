import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getMediaAssetById } from "@/lib/content/media-repository";

type ParamsContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(_request: Request, context: ParamsContext) {
  const { assetId } = await context.params;
  const asset = await getMediaAssetById(assetId);

  if (!asset) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  try {
    const data = await readFile(asset.storagePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "content-type": asset.mimeType || "application/octet-stream",
        "cache-control": "public, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Datei nicht lesbar." }, { status: 404 });
  }
}
