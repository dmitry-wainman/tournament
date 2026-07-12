import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session";

// Public API routes that unregistered visitors' pages don't call, but which must stay
// reachable without a session: none currently — the public site (/ and /tournaments/[id])
// reads data directly via server components, not through /api. Login/logout must also
// stay reachable without an existing session.
const PUBLIC_PATHS = ["/api/admin/login", "/api/admin/logout", "/admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isProtectedPage = pathname.startsWith("/admin");
  const isProtectedApi = pathname.startsWith("/api");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = process.env.SESSION_SECRET;
  const authenticated = Boolean(expected) && session === expected;

  if (authenticated) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
