import { NextResponse } from "next/server";
import { updatePageInputSchema } from "@/lib/content/content-page-schema";
import {
  deleteContentPage,
  getContentPageById,
  updateContentPage,
} from "@/lib/content/pages-repository";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

type ParamsContext = {
  params: Promise<{ pageId: string }>;
};

export async function GET(_request: Request, context: ParamsContext) {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const { pageId } = await context.params;
  const page = await getContentPageById(pageId);

  if (!page) {
    return NextResponse.json({ error: "Seite nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ page });
}

export async function PUT(request: Request, context: ParamsContext) {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const { pageId } = await context.params;
  const body = await request.json();
  const parsed = updatePageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const page = await updateContentPage(pageId, parsed.data);

    if (!page) {
      return NextResponse.json({ error: "Seite nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("duplicate key") || message.includes("content_pages_slug_key")) {
      return NextResponse.json(
        { error: "Slug existiert bereits." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Seite konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: ParamsContext) {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const { pageId } = await context.params;
  const deleted = await deleteContentPage(pageId);

  if (!deleted) {
    return NextResponse.json({ error: "Seite nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
