import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getCurrentAdminFromCookiesMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/admin-auth", () => ({
  getCurrentAdminFromCookies: getCurrentAdminFromCookiesMock,
}));

describe("app/admin/live/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to admin login", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue(null);

    const { default: AdminLivePage } = await import("./page");

    await expect(AdminLivePage()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });

  it("redirects authenticated admins to homepage edit mode", async () => {
    getCurrentAdminFromCookiesMock.mockResolvedValue({
      userId: "admin-id",
      email: "admin@example.com",
      role: "admin",
    });

    const { default: AdminLivePage } = await import("./page");

    await expect(AdminLivePage()).rejects.toThrow("NEXT_REDIRECT:/?edit=1");
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/?edit=1");
  });
});
