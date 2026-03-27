import { describe, expect, it } from "vitest";
import {
  createPageInputSchema,
  updatePageInputSchema,
} from "./content-page-schema";

describe("content-page-schema", () => {
  it("accepts valid create payload", () => {
    const payload = createPageInputSchema.parse({
      slug: "startseite",
      title: "Startseite",
      status: "draft",
      content: {
        hero: {
          heading: "Willkommen",
          subheading: "FR-Sieg",
          ctaLabel: "Mehr erfahren",
          ctaHref: "/verein",
        },
        panels: [
          {
            id: "p1",
            title: "Panel 1",
            text: "Text",
            color: "#1d4ed8",
          },
        ],
        partners: [
          {
            id: "partner-1",
            name: "Partner GmbH",
            url: "https://example.com",
            logoAssetId: null,
          },
        ],
      },
    });

    expect(payload.slug).toBe("startseite");
    expect(payload.content.panels).toHaveLength(1);
  });

  it("rejects invalid slug", () => {
    const result = createPageInputSchema.safeParse({
      slug: "Startseite Mit Leerzeichen",
      title: "Startseite",
      status: "draft",
      content: {},
    });

    expect(result.success).toBe(false);
  });

  it("allows partial updates", () => {
    const payload = updatePageInputSchema.parse({
      title: "Neue Überschrift",
      status: "published",
    });

    expect(payload.status).toBe("published");
    expect(payload.title).toBe("Neue Überschrift");
  });
});
