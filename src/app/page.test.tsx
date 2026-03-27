import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getContentPageBySlugMock = vi.fn();

vi.mock("../lib/content/pages-repository", () => ({
  getContentPageBySlug: getContentPageBySlugMock,
}));

vi.mock("./home-live-page", () => ({
  HomeLivePage: ({ initialContent }: { initialContent: { hero?: { heading?: string; subheading?: string; ctaLabel?: string } } }) => (
    <main>
      <h1>{initialContent.hero?.heading || "Willkommen bei FR-Sieg"}</h1>
      <p>{initialContent.hero?.subheading || "Hier entsteht die neue FR-Sieg Website."}</p>
      {initialContent.hero?.ctaLabel ? <a href="/kontakt">{initialContent.hero.ctaLabel}</a> : null}
    </main>
  ),
}));

describe("app/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders CMS home content when repository returns a home page", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: {
          heading: "CMS Hero Heading",
          subheading: "CMS Hero Subheading",
          ctaLabel: "Jetzt starten",
          ctaHref: "/kontakt",
        },
        panels: [],
        partners: [],
      },
    });

    const { default: Home } = await import("./page");
    const markup = renderToStaticMarkup(await Home());

    expect(getContentPageBySlugMock).toHaveBeenCalledWith("home", {
      preferPublished: true,
    });
    expect(markup).toContain("CMS Hero Heading");
    expect(markup).toContain("CMS Hero Subheading");
    expect(markup).toContain("Jetzt starten");
  });

  it("falls back to stable homepage markup when home page is missing", async () => {
    getContentPageBySlugMock.mockResolvedValue(null);

    const { default: Home } = await import("./page");
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain("Willkommen bei FR-Sieg");
    expect(markup).toContain("Wir verbinden Partner, Projekte und Menschen mit klaren Inhalten.");
  });

  it("falls back and logs a safe diagnostic reason when repository throws", async () => {
    getContentPageBySlugMock.mockRejectedValue(new Error("db offline"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { default: Home } = await import("./page");
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain("Willkommen bei FR-Sieg");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "homepage_fallback",
      expect.objectContaining({ reason: "repository-error" }),
    );

    consoleErrorSpy.mockRestore();
  });

  it("uses normalized defaults for incomplete hero payload", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: {},
        panels: [],
        partners: [],
      },
    });

    const { default: Home } = await import("./page");
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain("Willkommen bei FR-Sieg");
    expect(markup).toContain("Hier entsteht die neue FR-Sieg Website.");
  });

  it("falls back when content payload cannot be normalized", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: {},
        panels: [{}],
        partners: [],
      },
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { default: Home } = await import("./page");
    const markup = renderToStaticMarkup(await Home());

    expect(markup).toContain("Willkommen bei FR-Sieg");
    expect(markup).toContain("Wir verbinden Partner, Projekte und Menschen mit klaren Inhalten.");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "homepage_fallback",
      expect.objectContaining({ reason: "content-parse-failure" }),
    );

    consoleErrorSpy.mockRestore();
  });
});
