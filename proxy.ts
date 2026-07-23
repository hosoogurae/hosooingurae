import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./app/lib/adminAuth";

/** 로그인/로그아웃 자체는 세션이 없어도 호출할 수 있어야 합니다. */
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
