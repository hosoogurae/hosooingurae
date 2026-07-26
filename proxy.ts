import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./app/lib/adminAuth";

/** 로그인/로그아웃 자체는 세션이 없어도 호출할 수 있어야 합니다. */
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

/** 읽기 전용 메서드 — 공개 조회는 이 경로들에서도 인증 없이 그대로 열어둡니다. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * /api/listings, /api/listings/[id], /api/import-naver는 "공개 조회 GET"과
 * "관리자 전용 쓰기(POST/PATCH/DELETE)"가 같은 경로를 씁니다. 그래서
 * /api/admin/:path*처럼 경로 전체를 막을 수 없고, 매처로 일단 붙잡은 뒤
 * 아래에서 쓰기 메서드일 때만 인증을 요구합니다.
 */
function isMixedPublicWritePath(pathname: string): boolean {
  return (
    pathname === "/api/listings" ||
    /^\/api\/listings\/[^/]+$/.test(pathname) ||
    pathname === "/api/import-naver"
  );
}

/**
 * 세션 토큰은 웹에서는 쿠키로, 모바일 앱에서는 Authorization: Bearer 헤더로
 * 온다 — 둘 다 app/lib/adminAuth.ts의 같은 verifySessionToken으로 검증되는
 * 동일한 토큰 형식이라, 어느 쪽으로 오든 여기서 하나로 합쳐 꺼내기만 하면
 * 된다(쿠키 우선, 없으면 헤더).
 */
function extractToken(request: NextRequest): string | undefined {
  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return undefined;
}

/**
 * CSRF 점검: 로그인 쿠키가 SameSite=Lax라 크로스사이트 POST/PATCH/DELETE에는
 * 애초에 실려 오지 않지만, Origin 헤더가 있는데 이 요청의 호스트와 다르면
 * 한 번 더 명시적으로 차단합니다(방어 계층 추가). Origin이 없는 요청은
 * 굳이 막지 않습니다 — SameSite=Lax가 이미 1차 방어선입니다.
 */
function hasMismatchedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const isAdminOnlyPath =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/");
  const needsAuth =
    isAdminOnlyPath ||
    (isMixedPublicWritePath(pathname) && !SAFE_METHODS.has(request.method));

  if (!needsAuth) {
    return NextResponse.next();
  }

  if (hasMismatchedOrigin(request)) {
    return NextResponse.json(
      { error: "요청 출처가 올바르지 않습니다." },
      { status: 403 },
    );
  }

  const token = extractToken(request);
  if (verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/listings",
    "/api/listings/:path*",
    "/api/import-naver",
  ],
};
