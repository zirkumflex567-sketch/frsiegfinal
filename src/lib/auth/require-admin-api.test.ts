import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentAdminFromCookiesMock = vi.fn();

vi.mock("./admin-auth", () => ({
  getCurrentAdminFromCookies: getCurrentAdminFromCookiesMock,
}));

describe("requireAdminApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deterministic 401 envelope when unauthenticated", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue(null);

    const { requireAdminApi } = await import("./require-admin-api");
    const result = await requireAdminApi();

    expect(result.admin).toBeNull();
    expect(result.response).not.toBeNull();
    expect(result.response?.status).toBe(401);
    await expect(result.response?.json()).resolves.toEqual({
      error: "Nicht eingeloggt.",
    });
  });

  it("does not leak admin payload when auth gate fails", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue(null);

    const { requireAdminApi } = await import("./require-admin-api");
    const result = await requireAdminApi();

    expect(result.admin).toBeNull();
    await expect(result.response?.json()).resolves.toEqual({
      error: "Nicht eingeloggt.",
    });
  });

  it("returns admin payload and no response when authenticated", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@fr-sieg.de",
      role: "admin",
    });

    const { requireAdminApi } = await import("./require-admin-api");
    const result = await requireAdminApi();

    expect(result.response).toBeNull();
    expect(result.admin).toEqual({
      userId: "admin-1",
      email: "admin@fr-sieg.de",
      role: "admin",
    });
  });
});
