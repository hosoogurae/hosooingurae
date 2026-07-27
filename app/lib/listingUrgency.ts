import type { Listing } from "../data/listings";

/**
 * 매물의 재확인 시급도. 목록 배지·통계·필터가 이 함수 하나만 공유해 기준이
 * 어긋나지 않게 합니다.
 * - ok: 0~7일 이내 확인
 * - recommended: 8~13일
 * - urgent: 14일 이상 경과 또는 한 번도 확인한 적 없음
 *
 * app/lib/listings.ts(서버 전용, Supabase/sharp 의존)와 별도 파일로 둡니다 —
 * 관리자 목록 화면("use client")에서도 이 함수를 그대로 써야 하는데,
 * listings.ts를 client 컴포넌트에서 import하면 그 안의 서버 전용 의존성
 * (sharp 등)까지 브라우저 번들에 끌려 들어와 빌드가 깨집니다.
 */
export function getVerificationUrgency(
  listing: Pick<Listing, "lastVerifiedAt">,
): "ok" | "recommended" | "urgent" {
  if (!listing.lastVerifiedAt) {
    return "urgent";
  }
  const elapsedMs = Date.now() - new Date(listing.lastVerifiedAt).getTime();
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
  if (elapsedDays >= 14) {
    return "urgent";
  }
  if (elapsedDays >= 8) {
    return "recommended";
  }
  return "ok";
}
