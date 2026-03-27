import { beforeEach, describe, expect, it, vi } from "vitest";

const clearAdminSessionCookieMock = vi.fn();

vi.mock("@/lib/auth/session-cookie", () => ({
  clearAdminSessionCookie: clearAdminSessionCookieMock,
}));

describe("POST /api/admin/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok and clears the session cookie", async () => {
    const { POST } = await import("./route");

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(clearAdminSessionCookieMock).toHaveBeenCalledTimes(1);
    expect(clearAdminSessionCookieMock).toHaveBeenCalledWith(response);
  });
});
