import type { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "frsieg_admin_session";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

function shouldUseSecureCookie() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const authUrl = process.env.NEXTAUTH_URL ?? "";
  return authUrl.startsWith("https://");
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
