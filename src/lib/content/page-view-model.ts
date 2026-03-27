import { pageContentSchema, type PageContent } from "./content-page-schema";

export function normalizePageContent(input: unknown): PageContent {
  return pageContentSchema.parse(input ?? {});
}

export function getMediaUrl(assetId?: string | null) {
  if (!assetId) {
    return null;
  }

  return `/api/media/${assetId}`;
}
