import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiMock = vi.fn();
const deleteMediaAssetByIdMock = vi.fn();
const deleteStoredFileMock = vi.fn();

vi.mock("@/lib/auth/require-admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
}));

vi.mock("@/lib/content/media-repository", () => ({
  deleteMediaAssetById: deleteMediaAssetByIdMock,
}));

vi.mock("@/lib/content/media-storage", () => ({
  deleteStoredFile: deleteStoredFileMock,
}));

function params(assetId: string) {
  return { params: Promise.resolve({ assetId }) };
}

describe("/api/admin/media/[assetId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({ admin: { userId: "admin-1" }, response: null });
  });

  it("DELETE returns 401 envelope when unauthenticated", async () => {
    requireAdminApiMock.mockResolvedValue({
      admin: null,
      response: Response.json({ error: "Nicht eingeloggt." }, { status: 401 }),
    });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), params("asset-1"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Nicht eingeloggt." });
    expect(deleteMediaAssetByIdMock).not.toHaveBeenCalled();
  });

  it("DELETE returns 404 when asset does not exist", async () => {
    deleteMediaAssetByIdMock.mockResolvedValue(null);

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), params("missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Asset nicht gefunden." });
    expect(deleteStoredFileMock).not.toHaveBeenCalled();
  });

  it("DELETE returns ok and removes stored file", async () => {
    deleteMediaAssetByIdMock.mockResolvedValue({
      id: "asset-1",
      fileName: "logo.png",
      mimeType: "image/png",
      fileSizeBytes: 42,
      storagePath: "/tmp/logo.png",
      altText: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), params("asset-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteStoredFileMock).toHaveBeenCalledTimes(1);
    expect(deleteStoredFileMock).toHaveBeenCalledWith("/tmp/logo.png");
  });
});
