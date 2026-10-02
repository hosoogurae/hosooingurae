import type { Listing } from "../data/listings";

/**
 * "확인매물" 배지를 몇 일 이내 last_verified_at까지 보여줄지. 이 기간을
 * 넘으면 날짜·배지 둘 다 표시하지 않습니다(오래된 매물일수록 날짜가 더
 * 눈에 띄는 역효과를 막기 위함) — 2026-10-02 결정.
 */
export const VERIFIED_BADGE_MAX_AGE_DAYS = 30;

function formatVerifiedDate(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}

/**
 * last_verified_at이 VERIFIED_BADGE_MAX_AGE_DAYS 이내면 "확인매물
 * YYYY.MM.DD" 문구를, 아니면 null을 돌려줍니다. 목록 카드와 상세 페이지가
 * 이 함수 하나만 공유해 기준이 어긋나지 않게 합니다.
 *
 * 이전에는 네이버로 처음 가져올 때 한 번만 찍히고 다시는 안 바뀌는
 * verified_date를 기준으로 썼습니다(사실상 "등록일"과 같아져 버림). 지금은
 * "오늘 확인" 버튼·재가져오기로 실제로 갱신되는 last_verified_at을 씁니다.
 */
export function getVerifiedBadgeLabel(
  lastVerifiedAt: Listing["lastVerifiedAt"],
): string | null {
  if (!lastVerifiedAt) return null;
  const elapsedDays =
    (Date.now() - new Date(lastVerifiedAt).getTime()) / (24 * 60 * 60 * 1000);
  if (elapsedDays > VERIFIED_BADGE_MAX_AGE_DAYS) return null;
  return `확인매물 ${formatVerifiedDate(lastVerifiedAt)}`;
}
