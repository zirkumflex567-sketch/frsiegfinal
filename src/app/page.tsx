import { HomeLivePage } from "./home-live-page";
import { getContentPageBySlug } from "../lib/content/pages-repository";
import { normalizePageContent } from "../lib/content/page-view-model";
import type { PageContent } from "../lib/content/content-page-schema";

export const dynamic = "force-dynamic";

const FALLBACK_TITLE = "Startseite";

const FALLBACK_CONTENT: PageContent = {
  hero: {
    heading: "Willkommen bei FR-Sieg",
    subheading: "Wir verbinden Partner, Projekte und Menschen mit klaren Inhalten.",
    ctaLabel: "Kontakt",
    ctaHref: "/kontakt",
    backgroundAssetId: null,
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
  partners: [],
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
};

function renderFallback(reason: string) {
  console.error("homepage_fallback", { reason });

  return (
    <HomeLivePage
      pageId={null}
      initialTitle={FALLBACK_TITLE}
      initialStatus="published"
      initialContent={FALLBACK_CONTENT}
      canEdit={false}
      startInEditMode={false}
    />
  );
}

function classifyRepositoryFailure(error: unknown): "repository-timeout" | "repository-error" {
  if (error instanceof Error && /timeout|timed out|etimedout/i.test(error.message)) {
    return "repository-timeout";
  }

  return "repository-error";
}

export default async function Home() {
  try {
    const homePage = await getContentPageBySlug("home", { preferPublished: true });

    if (!homePage) {
      return renderFallback("home-missing");
    }

    let content: PageContent;

    try {
      content = normalizePageContent(homePage.content);
    } catch {
      return renderFallback("content-parse-failure");
    }

    return (
      <HomeLivePage
        pageId={homePage.id}
        initialTitle={homePage.title}
        initialStatus={homePage.status}
        initialContent={content}
        canEdit={false}
        startInEditMode={false}
      />
    );
  } catch (error) {
    return renderFallback(classifyRepositoryFailure(error));
  }
}
