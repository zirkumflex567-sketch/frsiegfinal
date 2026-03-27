import { NextResponse } from "next/server";
import { createPageInputSchema } from "@/lib/content/content-page-schema";
import { createContentPage, listContentPages } from "@/lib/content/pages-repository";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const pages = await listContentPages();
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) {
    return response;
  }

  const body = await request.json();
  const parsed = createPageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const page = await createContentPage(parsed.data);
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("duplicate key") || message.includes("content_pages_slug_key")) {
      return NextResponse.json(
        { error: "Slug existiert bereits." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Seite konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
