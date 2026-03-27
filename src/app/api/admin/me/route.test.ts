import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentAdminFromCookiesMock = vi.fn();

vi.mock("@/lib/auth/admin-auth", () => ({
  getCurrentAdminFromCookies: getCurrentAdminFromCookiesMock,
}));

describe("GET /api/admin/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 unauthenticated when session is missing or invalid", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue(null);
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });

  it("returns authenticated admin payload for valid session", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@fr-sieg.de",
      role: "admin",
      iat: 1,
      exp: 2,
    });

    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      admin: {
        userId: "admin-1",
        email: "admin@fr-sieg.de",
        role: "admin",
        iat: 1,
        exp: 2,
      },
    });
  });
});
