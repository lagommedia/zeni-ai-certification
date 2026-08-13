import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthorizationUrl, OAUTH_STATE_COOKIE } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();

  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildGoogleAuthorizationUrl({ redirectUri, state }));
}
