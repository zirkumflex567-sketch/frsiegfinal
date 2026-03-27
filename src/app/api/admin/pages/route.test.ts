import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiMock = vi.fn();
const listContentPagesMock = vi.fn();
const createContentPageMock = vi.fn();

vi.mock("@/lib/auth/require-admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
}));

vi.mock("@/lib/content/pages-repository", () => ({
  listContentPages: listContentPagesMock,
  createContentPage: createContentPageMock,
}));

describe("/api/admin/pages route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({ admin: { userId: "admin-1" }, response: null });
  });

  it("GET returns 401 envelope when unauthenticated", async () => {
    requireAdminApiMock.mockResolvedValue({
      admin: null,
      response: Response.json({ error: "Nicht eingeloggt." }, { status: 401 }),
    });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Nicht eingeloggt." });
    expect(listContentPagesMock).not.toHaveBeenCalled();
  });

  it("GET returns pages list", async () => {
    listContentPagesMock.mockResolvedValue([
      { id: "p1", slug: "home", title: "Home", status: "published", content: {}, createdAt: "a", updatedAt: "b" },
    ]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      pages: [
        { id: "p1", slug: "home", title: "Home", status: "published", content: {}, createdAt: "a", updatedAt: "b" },
      ],
    });
  });

  it("POST returns 400 for invalid page payload", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/pages", {
        method: "POST",
        body: JSON.stringify({ slug: "Invalid Slug", title: "", status: "draft", content: {} }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Ungültige Eingabe.",
        details: expect.any(Object),
      }),
    );
    expect(createContentPageMock).not.toHaveBeenCalled();
  });

  it("POST returns 409 for duplicate slug conflict", async () => {
    createContentPageMock.mockRejectedValue(new Error("duplicate key value violates unique constraint content_pages_slug_key"));
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/pages", {
        method: "POST",
        body: JSON.stringify({ slug: "home", title: "Home", status: "draft", content: {} }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Slug existiert bereits." });
  });

  it("POST returns 500 for repository failures", async () => {
    createContentPageMock.mockRejectedValue(new Error("db offline"));
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/pages", {
        method: "POST",
        body: JSON.stringify({ slug: "home", title: "Home", status: "draft", content: {} }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Seite konnte nicht erstellt werden." });
  });

  it("POST returns 201 with created page", async () => {
    createContentPageMock.mockResolvedValue({
      id: "p-new",
      slug: "home",
      title: "Start",
      status: "draft",
      content: {},
      createdAt: "x",
      updatedAt: "y",
    });

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/pages", {
        method: "POST",
        body: JSON.stringify({ slug: "home", title: "Start", status: "draft", content: {} }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      page: {
        id: "p-new",
        slug: "home",
        title: "Start",
        status: "draft",
        content: {},
        createdAt: "x",
        updatedAt: "y",
      },
    });
  });
});
