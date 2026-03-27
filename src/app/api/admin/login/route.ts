import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAdminByCredentials } from "@/lib/auth/admin-auth";
import { setAdminSessionCookie } from "@/lib/auth/session-cookie";

const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bitte E-Mail und Passwort korrekt eingeben." },
        { status: 400 },
      );
    }

    const authResult = await authenticateAdminByCredentials(parsed.data);
    if (!authResult) {
      return NextResponse.json(
        { error: "Ungültige Login-Daten." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: authResult.user,
    });

    setAdminSessionCookie(response, authResult.token);
    return response;
  } catch (error) {
    console.error("admin login error", error);

    return NextResponse.json(
      {
        error: "Login fehlgeschlagen. Bitte erneut versuchen.",
      },
      { status: 500 },
    );
  }
}
