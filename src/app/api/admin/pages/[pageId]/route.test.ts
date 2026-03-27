import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiMock = vi.fn();
const getContentPageByIdMock = vi.fn();
const updateContentPageMock = vi.fn();
const deleteContentPageMock = vi.fn();

vi.mock("@/lib/auth/require-admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
}));

vi.mock("@/lib/content/pages-repository", () => ({
  getContentPageById: getContentPageByIdMock,
  updateContentPage: updateContentPageMock,
  deleteContentPage: deleteContentPageMock,
}));

function params(pageId: string) {
  return { params: Promise.resolve({ pageId }) };
}

describe("/api/admin/pages/[pageId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({ admin: { userId: "admin-1" }, response: null });
  });

  it("GET returns 401 when unauthenticated", async () => {
    requireAdminApiMock.mockResolvedValue({
      admin: null,
      response: Response.json({ error: "Nicht eingeloggt." }, { status: 401 }),
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), params("missing"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Nicht eingeloggt." });
    expect(getContentPageByIdMock).not.toHaveBeenCalled();
  });

  it("GET returns 404 for unknown page", async () => {
    getContentPageByIdMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost"), params("missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Seite nicht gefunden." });
  });

  it("PUT returns 400 for malformed payload", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ status: "invalid-status" }),
      }),
      params("page-1"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Ungültige Eingabe.",
        details: expect.any(Object),
      }),
    );
    expect(updateContentPageMock).not.toHaveBeenCalled();
  });

  it("PUT returns 404 when target page does not exist", async () => {
    updateContentPageMock.mockResolvedValue(null);
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ title: "Neu" }),
      }),
      params("missing"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Seite nicht gefunden." });
  });

  it("PUT returns 409 on duplicate slug", async () => {
    updateContentPageMock.mockRejectedValue(new Error("duplicate key value violates unique constraint content_pages_slug_key"));
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ slug: "home" }),
      }),
      params("page-1"),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Slug existiert bereits." });
  });

  it("PUT returns 500 on repository error", async () => {
    updateContentPageMock.mockRejectedValue(new Error("db offline"));
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ title: "Neu" }),
      }),
      params("page-1"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Seite konnte nicht aktualisiert werden." });
  });

  it("DELETE returns 404 for unknown page", async () => {
    deleteContentPageMock.mockResolvedValue(false);
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost"), params("missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Seite nicht gefunden." });
  });

  it("DELETE returns ok for existing page", async () => {
    deleteContentPageMock.mockResolvedValue(true);
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost"), params("page-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
