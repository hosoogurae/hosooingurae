/**
 * /api/admin/login 전용 최소 rate limit. 별도 저장소 없이 서버 프로세스
 * 메모리에만 IP별 실패 횟수를 두는 단순한 방식입니다 — Vercel 서버리스
 * 특성상 인스턴스가 여러 개면 카운트가 인스턴스별로 나뉠 수 있지만, 가족이
 * 운영하는 저트래픽 관리자 화면에 무차별 대입을 늦추는 최소한의 방어로는
 * 충분합니다(완벽한 분산 rate limit이 필요하면 Upstash 같은 외부 저장소로
 * 교체하면 됩니다).
 */

const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15분 안의 실패만 누적
const LOCKOUT_MS = 15 * 60 * 1000; // 임계치 도달 시 15분 잠금

interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil?: number;
}

const attempts = new Map<string, AttemptRecord>();

function pruneStaleEntries(now: number) {
  if (attempts.size < 500) return;
  for (const [ip, record] of attempts) {
    const expired = record.lockedUntil
      ? now >= record.lockedUntil
      : now - record.firstFailureAt > FAILURE_WINDOW_MS;
    if (expired) attempts.delete(ip);
  }
}

export function checkLoginRateLimit(
  ip: string,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const record = attempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      };
    }
    attempts.delete(ip);
    return { allowed: true };
  }

  if (now - record.firstFailureAt > FAILURE_WINDOW_MS) {
    attempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  pruneStaleEntries(now);

  const record = attempts.get(ip);
  if (!record || now - record.firstFailureAt > FAILURE_WINDOW_MS) {
    attempts.set(ip, { failures: 1, firstFailureAt: now });
    return;
  }

  record.failures += 1;
  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

export function recordLoginSuccess(ip: string) {
  attempts.delete(ip);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
