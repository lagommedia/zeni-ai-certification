import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

// /analytics is deliberately not in this list — Team Leads (a per-team
// designation, not a Role value) can also access it. The proxy can't know
// team-lead status from the cheap signed cookie alone, so the authoritative
// admin-or-team-lead check happens in the page itself against the database.
const ADMIN_ONLY_PREFIXES = ["/settings"];
const PUBLIC_PATHS = ["/login"];
// Fully public regardless of auth state — no redirect either direction.
// Meant for third parties (e.g. LinkedIn, a recruiter) with no Zeni account.
const PUBLIC_OPEN_PATHS = ["/certificates/verify"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_OPEN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (session) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAdminOnly && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/courses", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff|woff2)$).*)",
  ],
};
