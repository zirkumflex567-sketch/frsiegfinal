import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminApiMock = vi.fn();
const listMediaAssetsMock = vi.fn();
const saveUploadedFileMock = vi.fn();
const createMediaAssetMock = vi.fn();

vi.mock("@/lib/auth/require-admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
}));

vi.mock("@/lib/content/media-repository", () => ({
  listMediaAssets: listMediaAssetsMock,
  createMediaAsset: createMediaAssetMock,
}));

vi.mock("@/lib/content/media-storage", () => ({
  saveUploadedFile: saveUploadedFileMock,
}));

describe("/api/admin/media route", () => {
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
    expect(listMediaAssetsMock).not.toHaveBeenCalled();
  });

  it("GET maps fileUrl for each asset", async () => {
    listMediaAssetsMock.mockResolvedValue([
      {
        id: "a1",
        fileName: "logo.png",
        mimeType: "image/png",
        fileSizeBytes: 42,
        storagePath: "/tmp/logo.png",
        altText: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      media: [
        {
          id: "a1",
          fileName: "logo.png",
          mimeType: "image/png",
          fileSizeBytes: 42,
          storagePath: "/tmp/logo.png",
          altText: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          fileUrl: "/api/media/a1",
        },
      ],
    });
  });

  it("POST returns 400 when file is missing", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/admin/media", { method: "POST", body: new FormData() }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Datei fehlt." });
    expect(saveUploadedFileMock).not.toHaveBeenCalled();
  });

  it("POST returns 400 for invalid altText", async () => {
    const formData = new FormData();
    formData.set("file", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    formData.set("altText", "x".repeat(201));

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/admin/media", { method: "POST", body: formData }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Alt-Text ist ungültig." });
    expect(saveUploadedFileMock).not.toHaveBeenCalled();
  });

  it("POST returns 400 for zero-byte files", async () => {
    const formData = new FormData();
    formData.set("file", new File([], "empty.png", { type: "image/png" }));

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/admin/media", { method: "POST", body: formData }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Datei ist leer." });
  });

  it("POST returns 413 when file exceeds 10MB", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "too-big.bin", { type: "application/octet-stream" }),
    );

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/admin/media", { method: "POST", body: formData }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "Datei ist zu groß (max 10MB)." });
    expect(saveUploadedFileMock).not.toHaveBeenCalled();
  });

  it("POST returns 201 and persists asset metadata", async () => {
    saveUploadedFileMock.mockResolvedValue({
      fileName: "stored.png",
      storagePath: "/tmp/stored.png",
    });
    createMediaAssetMock.mockResolvedValue({
      id: "asset-1",
      fileName: "stored.png",
      storagePath: "/tmp/stored.png",
      mimeType: "image/png",
      fileSizeBytes: 3,
      altText: "Logo",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const formData = new FormData();
    formData.set("file", new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }));
    formData.set("altText", " Logo ");

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/admin/media", { method: "POST", body: formData }));

    expect(response.status).toBe(201);
    expect(saveUploadedFileMock).toHaveBeenCalledTimes(1);
    expect(createMediaAssetMock).toHaveBeenCalledWith({
      fileName: "stored.png",
      storagePath: "/tmp/stored.png",
      fileSizeBytes: 3,
      mimeType: "image/png",
      altText: "Logo",
    });
    await expect(response.json()).resolves.toEqual({
      asset: {
        id: "asset-1",
        fileName: "stored.png",
        storagePath: "/tmp/stored.png",
        mimeType: "image/png",
        fileSizeBytes: 3,
        altText: "Logo",
        createdAt: "2026-01-01T00:00:00.000Z",
        fileUrl: "/api/media/asset-1",
      },
    });
  });
});
