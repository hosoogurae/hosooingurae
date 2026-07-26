import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyAdminCredentials,
} from "../../../lib/adminAuth";
import {
  checkLoginRateLimit,
  getClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from "../../../lib/adminLoginRateLimit";

const INVALID_CREDENTIALS_MESSAGE = "아이디 또는 비밀번호가 올바르지 않습니다.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `너무 많은 로그인 시도가 있었습니다. ${Math.ceil(
          rateLimit.retryAfterSeconds / 60,
        )}분 후 다시 시도해주세요.`,
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password || !verifyAdminCredentials(username, password)) {
    recordLoginFailure(ip);
    return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  recordLoginSuccess(ip);

  // 웹은 아래 httpOnly 쿠키만 쓰고 이 필드는 그냥 무시합니다(로그인 화면
  // 코드가 response.ok만 확인). token은 모바일 앱이 Authorization: Bearer
  // 헤더로 쓰기 위한 값 — 같은 서명 토큰을 쿠키와 바디 양쪽에 동일하게
  // 실어 보낼 뿐, 별도로 발급하는 게 아닙니다.
  const token = createSessionToken(username);
  const response = NextResponse.json({ success: true, token });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
