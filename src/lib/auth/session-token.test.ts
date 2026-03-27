import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./session-token";

describe("admin session token", () => {
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
});
