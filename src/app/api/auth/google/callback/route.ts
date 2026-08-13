import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import {
  ALLOWED_GOOGLE_DOMAIN,
  exchangeGoogleAuthCode,
  OAUTH_STATE_COOKIE,
} from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  if (oauthError || !code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();

  let profile;
  try {
    profile = await exchangeGoogleAuthCode({ code, redirectUri });
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const emailDomain = profile.email.split("@")[1]?.toLowerCase();
  if (!profile.email_verified || emailDomain !== ALLOWED_GOOGLE_DOMAIN) {
    return NextResponse.redirect(new URL("/login?error=domain", request.url));
  }

  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: profile.name, email: profile.email },
    });
  }

  await createSession(user.id, user.role);
  return NextResponse.redirect(new URL("/courses", request.url));
}
