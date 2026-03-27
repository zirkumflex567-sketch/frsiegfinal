import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { deleteMediaAssetById } from "@/lib/content/media-repository";
import { deleteStoredFile } from "@/lib/content/media-storage";

type ParamsContext = {
  params: Promise<{ assetId: string }>;
};

export async function DELETE(_request: Request, context: ParamsContext) {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const { assetId } = await context.params;
  const deleted = await deleteMediaAssetById(assetId);

  if (!deleted) {
    return NextResponse.json({ error: "Asset nicht gefunden." }, { status: 404 });
  }

  await deleteStoredFile(deleted.storagePath);

  return NextResponse.json({ ok: true });
}
