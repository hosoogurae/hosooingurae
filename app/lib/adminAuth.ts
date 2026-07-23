import crypto from "node:crypto";

/**
 * 단일 관리자 계정 인증. 아이디/비밀번호는 소스코드에 두지 않고 환경변수
 * (ADMIN_USERNAME, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET)에서만 읽습니다.
 * 세션은 DB 없이 서명된 쿠키(HMAC-SHA256) 하나로 관리하는 stateless 방식입니다.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7일

interface SessionPayload {
  u: string;
  exp: number;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/** scripts/generate-admin-password-hash.mjs로 만든 "salt(hex):key(hex)" 형식을 검증합니다. */
function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, keyHex] = storedHash.split(":");
  if (!saltHex || !keyHex) return false;

  let salt: Buffer;
  let expectedKey: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expectedKey = Buffer.from(keyHex, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expectedKey.length === 0) return false;

  const derivedKey = crypto.scryptSync(password, salt, expectedKey.length);
  return crypto.timingSafeEqual(derivedKey, expectedKey);
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !expectedHash) {
    console.error(
      "[adminAuth] ADMIN_USERNAME/ADMIN_PASSWORD_HASH 환경변수가 설정되어 있지 않습니다.",
    );
    return false;
  }

  const usernameMatches = timingSafeEqualStrings(username, expectedUsername);
  const passwordMatches = verifyPassword(password, expectedHash);
  return usernameMatches && passwordMatches;
}

function sign(payloadB64: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET 환경변수가 설정되어 있지 않습니다.");
  }
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined | null,
): boolean {
  if (!token) return false;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  let expectedSignature: string;
  try {
    expectedSignature = sign(payloadB64);
  } catch {
    return false;
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
    return typeof payload.exp === "number" && Date.now() <= payload.exp;
  } catch {
    return false;
  }
}
