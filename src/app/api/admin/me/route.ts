import { NextResponse } from "next/server";
import { getCurrentAdminFromCookies } from "@/lib/auth/admin-auth";

export async function GET() {
  const admin = await getCurrentAdminFromCookies();

  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    admin,
  });
}
