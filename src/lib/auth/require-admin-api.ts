import { NextResponse } from "next/server";
import { getCurrentAdminFromCookies } from "./admin-auth";

export async function requireAdminApi() {
  const admin = await getCurrentAdminFromCookies();

  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 }),
    };
  }

  return { admin, response: null };
}
