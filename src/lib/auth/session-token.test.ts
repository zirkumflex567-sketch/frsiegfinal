import { SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./session-token";

describe("admin session token", () => {
  const originalSecret = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
      return;
    }

    process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it("creates and verifies a roundtrip token", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-vitest-123456";

    const token = await createAdminSessionToken({
      userId: "u_1",
      role: "admin",
      email: "admin@fr-sieg.de",
    });

    const decoded = await verifyAdminSessionToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe("u_1");
    expect(decoded?.role).toBe("admin");
    expect(decoded?.email).toBe("admin@fr-sieg.de");
  });

  it("returns null for invalid token", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-vitest-123456";

    await expect(verifyAdminSessionToken("not-a-jwt")).resolves.toBeNull();
  });

  it("returns null for malformed JWT payload fields", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-vitest-123456";
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    const malformedToken = await new SignJWT({
      userId: 123,
      email: "admin@fr-sieg.de",
      role: "admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    await expect(verifyAdminSessionToken(malformedToken)).resolves.toBeNull();
  });

  it("returns null for expired token payload", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-vitest-123456";
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    const expiredToken = await new SignJWT({
      userId: "u_1",
      email: "admin@fr-sieg.de",
      role: "admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    await expect(verifyAdminSessionToken(expiredToken)).resolves.toBeNull();
  });

  it("throws when creating token without NEXTAUTH_SECRET", async () => {
    delete process.env.NEXTAUTH_SECRET;

    await expect(
      createAdminSessionToken({
        userId: "u_1",
        role: "admin",
        email: "admin@fr-sieg.de",
      }),
    ).rejects.toThrow("NEXTAUTH_SECRET must be set and at least 16 characters long.");
  });

  it("throws when creating token with short NEXTAUTH_SECRET", async () => {
    process.env.NEXTAUTH_SECRET = "too-short";

    await expect(
      createAdminSessionToken({
        userId: "u_1",
        role: "admin",
        email: "admin@fr-sieg.de",
      }),
    ).rejects.toThrow("NEXTAUTH_SECRET must be set and at least 16 characters long.");
  });

  it("returns null for verification when NEXTAUTH_SECRET is missing", async () => {
    delete process.env.NEXTAUTH_SECRET;

    await expect(verifyAdminSessionToken("any-token")).resolves.toBeNull();
  });

  it("returns null for verification when NEXTAUTH_SECRET is too short", async () => {
    process.env.NEXTAUTH_SECRET = "too-short";

    await expect(verifyAdminSessionToken("any-token")).resolves.toBeNull();
  });
});
