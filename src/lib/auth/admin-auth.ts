import { cookies } from "next/headers";
import { getDbPool } from "@/lib/db/pool";
import { ensureCoreSchema } from "@/lib/db/bootstrap";
import { verifyPassword } from "./password";
import { ADMIN_SESSION_COOKIE } from "./session-cookie";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./session-token";
import type { AdminSessionPayload, AdminUser } from "./types";

export async function authenticateAdminByCredentials(input: {
  email: string;
  password: string;
}): Promise<{ user: AdminUser; token: string } | null> {
  await ensureCoreSchema();

  const email = input.email.trim().toLowerCase();
  const dbPool = getDbPool();

  const result = await dbPool.query<{
    id: string;
    email: string;
    password_hash: string;
    role: "admin" | "editor";
    is_active: boolean;
  }>(
    "SELECT id, email, password_hash, role, is_active FROM admin_users WHERE email = $1 LIMIT 1",
    [email],
  );

  const row = result.rows[0];
  if (!row || !row.is_active) {
    return null;
  }

  const isValidPassword = await verifyPassword(input.password, row.password_hash);
  if (!isValidPassword) {
    return null;
  }

  await dbPool.query(
    "UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1",
    [row.id],
  );

  const user: AdminUser = {
    id: row.id,
    email: row.email,
    role: row.role,
  };

  const token = await createAdminSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token };
}

export async function getCurrentAdminFromCookies(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token);
}
