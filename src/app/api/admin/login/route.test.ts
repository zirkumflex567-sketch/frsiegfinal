import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateAdminByCredentialsMock = vi.fn();
const setAdminSessionCookieMock = vi.fn();

vi.mock("@/lib/auth/admin-auth", () => ({
  authenticateAdminByCredentials: authenticateAdminByCredentialsMock,
}));

vi.mock("@/lib/auth/session-cookie", () => ({
  setAdminSessionCookie: setAdminSessionCookieMock,
}));

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for malformed login payload", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: "invalid-email" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Bitte E-Mail und Passwort korrekt eingeben.",
    });
    expect(authenticateAdminByCredentialsMock).not.toHaveBeenCalled();
  });

  it("returns 401 for credential mismatch", async () => {
    authenticateAdminByCredentialsMock.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@fr-sieg.de",
          password: "wrong-password",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Ungültige Login-Daten.",
    });
    expect(setAdminSessionCookieMock).not.toHaveBeenCalled();
  });

  it("returns 200 and sets session cookie for valid credentials", async () => {
    authenticateAdminByCredentialsMock.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@fr-sieg.de",
        role: "admin",
      },
      token: "session-token",
    });

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@fr-sieg.de",
          password: "correct-password",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: {
        id: "admin-1",
        email: "admin@fr-sieg.de",
        role: "admin",
      },
    });

    expect(setAdminSessionCookieMock).toHaveBeenCalledTimes(1);
    expect(setAdminSessionCookieMock).toHaveBeenCalledWith(response, "session-token");
  });

  it("returns 500 when auth helper throws", async () => {
    authenticateAdminByCredentialsMock.mockRejectedValue(new Error("db offline"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@fr-sieg.de",
          password: "any",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Login fehlgeschlagen. Bitte erneut versuchen.",
    });
    expect(setAdminSessionCookieMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("admin login error", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});
