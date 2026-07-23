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

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
