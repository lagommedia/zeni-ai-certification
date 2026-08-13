import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Clears a session cookie that no longer maps to a real user (e.g. after a
// database reseed) and sends the browser to /login. Cookie mutation has to
// happen in a Route Handler, not a Server Component — see (app)/layout.tsx.
export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
