import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HomeLivePage,
  parseJsonSafely,
  requestMediaList,
  requestSavePage,
  requestUploadMedia,
  resolveApiErrorMessage,
} from "./home-live-page";
import type { PageContent } from "@/lib/content/content-page-schema";

const baseContent: PageContent = {
  hero: {},
  typography: {},
  colors: {},
  links: {},
  panels: [],
  partners: [],
};

describe("home-live-page helpers", () => {
  it("uses endpoint-provided error strings and falls back for malformed payloads", () => {
    expect(resolveApiErrorMessage({ error: "Kaputt" }, "Fallback")).toBe("Kaputt");
    expect(resolveApiErrorMessage({ error: 123 }, "Fallback")).toBe("Fallback");
    expect(resolveApiErrorMessage("bad", "Fallback")).toBe("Fallback");
  });

  it("parses valid JSON and returns null for malformed JSON", async () => {
    const ok = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const malformed = new Response("<html>broken", {
      status: 500,
      headers: { "content-type": "application/json" },
    });

    await expect(parseJsonSafely(ok)).resolves.toEqual({ ok: true });
    await expect(parseJsonSafely(malformed)).resolves.toBeNull();
  });

  it("returns deterministic errors for malformed media list responses", async () => {
    await expect(
      requestMediaList(async () =>
        new Response("<html>", {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).rejects.toThrow("Medien konnten nicht geladen werden.");
  });

  it("returns deterministic errors for save timeout/fetch failures", async () => {
    await expect(
      requestSavePage(
        {
          pageId: "home-id",
          title: "Home",
          status: "draft",
          content: baseContent,
        },
        async () => {
          throw new Error("timeout");
        },
      ),
    ).rejects.toThrow("Speichern fehlgeschlagen.");
  });

  it("rejects malformed upload input (missing selected file)", async () => {
    await expect(requestUploadMedia({ file: null }, async () => new Response())).rejects.toThrow(
      "Bitte erst eine Datei auswählen.",
    );
  });
});

describe("HomeLivePage boundary rendering", () => {
  it("shows admin login affordance when editor is unavailable", () => {
    const html = renderToStaticMarkup(
      <HomeLivePage
        pageId={"home-id"}
        initialTitle={"Home"}
        initialStatus={"draft"}
        initialContent={baseContent}
        canEdit={false}
        startInEditMode={false}
      />,
    );

    expect(html).toContain("/admin/login");
    expect(html).toContain("Admin Login");
    expect(html).not.toContain("Oma-Modus Editor");
  });

  it("keeps editor toggle label consistent with startInEditMode", () => {
    const closedHtml = renderToStaticMarkup(
      <HomeLivePage
        pageId={"home-id"}
        initialTitle={"Home"}
        initialStatus={"draft"}
        initialContent={baseContent}
        canEdit={true}
        startInEditMode={false}
      />,
    );

    const openHtml = renderToStaticMarkup(
      <HomeLivePage
        pageId={"home-id"}
        initialTitle={"Home"}
        initialStatus={"draft"}
        initialContent={baseContent}
        canEdit={true}
        startInEditMode={true}
      />,
    );

    expect(closedHtml).toContain("Oma-Modus Editor");
    expect(openHtml).toContain("Editor schließen");
  });
});
