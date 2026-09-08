/**
 * 밖으로 나가는 링크(문의 복사 텍스트·공유 버튼·문자 양식·비교하기 링크·
 * 광고문구처럼 손님에게 전달되는 URL)는 전부 이 함수를 씁니다.
 * process.env.NEXT_PUBLIC_SITE_URL(검색엔진에 알려주는 단 하나의 공식
 * 주소)만 근거로 삼습니다 — 관리자가 지금 apex/www/vercel.app 미리보기 중
 * 어떤 도메인으로 접속해 있든, 손님에게 나가는 주소는 항상 같아야 하기
 * 때문입니다. (예전엔 요청 host를 그대로 쓰는 함수가 있었는데, vercel.app
 * 미리보기 도메인으로 접속한 채 문의 텍스트를 만들면 그 주소가 손님에게
 * 그대로 전달되는 사고가 있었습니다. "지금 접속한 주소"가 진짜로 필요한
 * 곳은 조사 결과 없어서 그 함수는 지웠습니다 — 필요해지면 그때 다시
 * 만드세요.)
 */
export function buildSiteUrl(path: string): string | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return siteUrl ? `${siteUrl}${path}` : undefined;
}
