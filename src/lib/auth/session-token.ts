import { SignJWT, jwtVerify } from "jose";
import type { AdminSessionPayload } from "./types";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getEncodedSecret() {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error(
      "NEXTAUTH_SECRET must be set and at least 16 characters long.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(
  payload: Omit<AdminSessionPayload, "exp" | "iat">,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(String(SESSION_TTL_SECONDS) + "s")
    .sign(getEncodedSecret());
}

export async function verifyAdminSessionToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), {
      algorithms: ["HS256"],
    });

    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role;

    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      (role !== "admin" && role !== "editor")
    ) {
      return null;
    }

    return {
      userId,
      email,
      role,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}
