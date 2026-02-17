import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-compatible: do not import auth from @/auth (it uses Node crypto via prisma/bcrypt).
// We only check for the presence of the NextAuth session cookie; real auth is enforced in API/layouts.
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some(
    (name) => request.cookies.get(name)?.value != null
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);
  const isLoginPage = pathname === "/login";
  const isRoot = pathname === "/";

  if (isRoot) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/account/:path*",
    "/projects/:path*",
    "/inbox/:path*",
    "/admin/:path*",
    "/api/account/:path*",
    "/api/users/:path*",
    "/api/projects/:path*",
    "/api/admin/:path*",
    "/api/messages/:path*",
    "/api/notifications/:path*",
    "/api/audit/:path*",
  ],
};
