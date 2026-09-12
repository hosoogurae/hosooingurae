import { formatFloorForSentence } from "./format/listingFields";
import { buildSiteUrl } from "./siteUrl";

/**
 * "문의하신 매물 안내" 문자 전용 순수 텍스트 로직입니다(Supabase 등 서버
 * 전용 코드를 섞지 않습니다 — 관리자 문자 작성 화면에서 그대로 import).
 * 사무소명·전화번호는 이 파일이 직접 채우지 않고 {사무소명}/{부동산전화번호}
 * 토큰을 그대로 남겨 호출부가 smsTemplateText.ts의 resolveSmsTemplate로
 * 치환하게 합니다 — 사무소 정보를 채우는 경로를 하나로 유지하기 위함입니다.
 */

export interface ListingAnnouncementListing {
  id: string;
  complexName: string;
  building: string;
  floor: number;
  transactionType: string;
  priceLabel: string;
}

export interface ListingAnnouncementResult {
  body: string;
  /**
   * 매물 상세/비교 페이지 링크. NEXT_PUBLIC_SITE_URL이 설정되지 않아
   * 링크를 만들지 못하면 undefined입니다 — 이 경우 body에는 링크 문단이
   * 빠져 있으므로(조용히 없어진 것이 아니라, 호출부가 이 값을 보고
   * 관리자에게 반드시 경고해야 합니다).
   */
  linkUrl: string | undefined;
}

/**
 * 매물 1건이면 상세 페이지, 2~3건이면 비교 페이지 링크를 만듭니다.
 * ids 순서는 호출부가 넘긴 배열 순서(=관리자가 고른 순서) 그대로
 * 유지합니다 — 문자 속 번호와 비교 페이지에서 보이는 순서가 어긋나면
 * 손님이 "2번"을 봐도 어느 매물인지 헷갈립니다.
 */
function buildListingLinkPath(listings: ListingAnnouncementListing[]): string {
  if (listings.length === 1) {
    return `/listings/${listings[0].id}`;
  }
  return `/compare?ids=${listings.map((listing) => listing.id).join(",")}`;
}

/**
 * 선택한 매물 목록(고른 순서 그대로)으로 안내 문자 초안을 만듭니다.
 * 동·층처럼 없는 값은 지어내지 않고 그 매물 줄에서만 생략합니다.
 */
export function buildListingAnnouncementBody(
  listings: ListingAnnouncementListing[],
): ListingAnnouncementResult {
  const linkUrl = listings.length > 0 ? buildSiteUrl(buildListingLinkPath(listings)) : undefined;

  const lines: string[] = ["안녕하세요. {사무소명}입니다.", "문의하신 매물 안내드립니다.", ""];

  listings.forEach((listing, index) => {
    const parts = [listing.complexName];
    if (listing.building.trim() !== "") parts.push(listing.building.trim());
    const floorText = formatFloorForSentence(listing.floor);
    if (floorText) parts.push(floorText);

    lines.push(`${index + 1}. ${parts.join(" ")}`);
    lines.push(`   ${listing.transactionType} ${listing.priceLabel}`);
  });

  if (linkUrl) {
    lines.push("", "사진·평면도 등 자세한 내용은 아래에서 보실 수 있습니다.", linkUrl);
  }

  lines.push("", "문의: {부동산전화번호}");

  return { body: lines.join("\n"), linkUrl };
}
