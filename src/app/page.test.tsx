import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getContentPageBySlugMock = vi.fn();
const getCurrentAdminFromCookiesMock = vi.fn();
const homeLivePagePropsMock = vi.fn();

vi.mock("../lib/content/pages-repository", () => ({
  getContentPageBySlug: getContentPageBySlugMock,
}));

vi.mock("../lib/auth/admin-auth", () => ({
  getCurrentAdminFromCookies: getCurrentAdminFromCookiesMock,
}));

vi.mock("./home-live-page", () => ({
  HomeLivePage: (props: {
    canEdit: boolean;
    startInEditMode: boolean;
    initialContent: { hero?: { heading?: string; subheading?: string; ctaLabel?: string } };
  }) => {
    homeLivePagePropsMock(props);

    return (
      <main data-can-edit={String(props.canEdit)} data-start-edit={String(props.startInEditMode)}>
        <h1>{props.initialContent.hero?.heading || "Willkommen bei FR-Sieg"}</h1>
        <p>{props.initialContent.hero?.subheading || "Hier entsteht die neue FR-Sieg Website."}</p>
        {props.initialContent.hero?.ctaLabel ? <a href="/kontakt">{props.initialContent.hero.ctaLabel}</a> : null}
      </main>
    );
  },
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

  it("opens edit mode only when admin is authenticated and edit query equals 1", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: { heading: "CMS Hero Heading" },
        panels: [],
        partners: [],
      },
    });
    getCurrentAdminFromCookiesMock.mockResolvedValue({
      userId: "admin-id",
      email: "admin@example.com",
      role: "admin",
    });

    const { default: Home } = await import("./page");
    renderToStaticMarkup(
      await Home({
        searchParams: Promise.resolve({ edit: "1" }),
      }),
    );

    expect(getCurrentAdminFromCookiesMock).toHaveBeenCalledTimes(1);
    expect(homeLivePagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ canEdit: true, startInEditMode: true }),
    );
  });

  it("does not open edit mode for malformed or missing edit query values", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: { heading: "CMS Hero Heading" },
        panels: [],
        partners: [],
      },
    });

    const { default: Home } = await import("./page");

    renderToStaticMarkup(await Home({ searchParams: Promise.resolve({ edit: "0" }) }));
    renderToStaticMarkup(await Home({ searchParams: Promise.resolve({ edit: "true" }) }));
    renderToStaticMarkup(await Home({ searchParams: Promise.resolve({ edit: ["1"] }) }));
    renderToStaticMarkup(await Home({ searchParams: Promise.resolve({}) }));

    expect(getCurrentAdminFromCookiesMock).not.toHaveBeenCalled();
    expect(homeLivePagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ canEdit: false, startInEditMode: false }),
    );
  });

  it("keeps public mode when auth helper fails while edit query is enabled", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: { heading: "CMS Hero Heading" },
        panels: [],
        partners: [],
      },
    });
    getCurrentAdminFromCookiesMock.mockRejectedValue(new Error("auth unavailable"));

    const { default: Home } = await import("./page");
    renderToStaticMarkup(await Home({ searchParams: Promise.resolve({ edit: "1" }) }));

    expect(getCurrentAdminFromCookiesMock).toHaveBeenCalledTimes(1);
    expect(homeLivePagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ canEdit: false, startInEditMode: false }),
    );
  });

  it("does not open edit mode for authenticated admin when edit query is missing", async () => {
    getContentPageBySlugMock.mockResolvedValue({
      id: "home-id",
      slug: "home",
      title: "Startseite",
      status: "published",
      content: {
        hero: { heading: "CMS Hero Heading" },
        panels: [],
        partners: [],
      },
    });
    getCurrentAdminFromCookiesMock.mockResolvedValue({
      userId: "admin-id",
      email: "admin@example.com",
      role: "admin",
    });

    const { default: Home } = await import("./page");
    renderToStaticMarkup(await Home());

    expect(getCurrentAdminFromCookiesMock).not.toHaveBeenCalled();
    expect(homeLivePagePropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ canEdit: false, startInEditMode: false }),
    );
  });
});
