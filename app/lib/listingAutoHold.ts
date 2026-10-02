import type { ListingWithComplex } from "./listings";

/** 이 일수를 넘게 last_verified_at이 갱신되지 않은 매물을 자동 보류합니다. */
export const AUTO_HOLD_STALE_DAYS = 90;

/** 한 번 실행에 보류시킬 수 있는 최대 건수. 넘으면 아무것도 바꾸지 않습니다. */
export const AUTO_HOLD_MAX_PER_RUN = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AutoHoldCandidate {
  id: string;
  complexName: string;
  lastVerifiedAt: string;
  daysSinceVerified: number;
}

/**
 * "90일 초과"의 정의: 경과일이 90보다 커야(> 90) 대상입니다. 즉 정확히
 * 90일째인 매물은 아직 포함하지 않고, 91일째부터 포함합니다.
 *
 * last_verified_at이 없는(undefined) 매물은 항상 제외합니다 — null은
 * 데이터가 비정상인 상태일 수 있고, 그걸 근거로 손님 화면에서 매물을
 * 내리는 건 위험하다는 "모르는 값은 건드리지 않는다" 원칙에 따른 결정입니다
 * (2026-10-02). 지금(2026-10-02) 기준 last_verified_at이 null인 매물은
 * 0건이라 당장 영향은 없습니다.
 *
 * now를 인자로 받는 건 테스트에서 "지금"을 고정해 89/90/91일 경계를
 * 흔들림 없이 검증하기 위함입니다 — 기본값은 실제 현재 시각입니다.
 */
export function isEligibleForAutoHold(
  lastVerifiedAt: string | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastVerifiedAt) return false;
  const elapsedDays = (now - new Date(lastVerifiedAt).getTime()) / MS_PER_DAY;
  return elapsedDays > AUTO_HOLD_STALE_DAYS;
}

/**
 * 자동 보류 대상(advertising이고 90일 초과)만 추립니다. negotiating·
 * completed·hold는 애초에 advertising이 아니므로 자동으로 빠집니다 —
 * 협상 중이거나 이미 처리된 매물을 cron이 건드리는 일이 없습니다.
 */
export function findAutoHoldCandidates(
  listings: ListingWithComplex[],
  now: number = Date.now(),
): AutoHoldCandidate[] {
  return listings
    .filter(
      (listing) =>
        listing.dealStatus === "advertising" &&
        isEligibleForAutoHold(listing.lastVerifiedAt, now),
    )
    .map((listing) => ({
      id: listing.id,
      complexName: listing.complex.name,
      lastVerifiedAt: listing.lastVerifiedAt as string,
      daysSinceVerified: Math.floor(
        (now - new Date(listing.lastVerifiedAt as string).getTime()) / MS_PER_DAY,
      ),
    }));
}
