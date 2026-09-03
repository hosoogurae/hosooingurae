import type { Listing } from "../data/listings";

/** MOLIT 실거래 구간 나누기와 같은 오차범위(㎡) — 같은 "구간"으로 보이려면 기준이 같아야 함. */
const AREA_TOLERANCE = 1;

export interface AskingSaleListing {
  id: string;
  priceLabel: string;
  floor: number;
  exclusiveArea: number;
}

export interface AskingListingsForBracket {
  /** 매매 매물은 그대로 목록으로 보여줍니다(통계 아님 — "지금 있는 매물" 그 자체이므로 5건 규칙 적용 안 함). */
  saleListings: AskingSaleListing[];
  /** 매매는 없지만 전세·월세는 있을 수 있어 별도로 셉니다(0건일 때 "매물이 없습니다"로 단정하지 않기 위함). */
  jeonseCount: number;
  wolseCount: number;
}

/**
 * 이미 한 단지로 좁혀진 매물 목록(아파트, 공개중)을 전용면적 구간 하나에
 * 대해 정리합니다. exclusiveArea를 모르는 매물(0 또는 null)은 어느
 * 구간인지 판단할 근거가 없어 어느 쪽에도 넣지 않습니다(추측 금지).
 */
export function buildAskingListingsForBracket(
  complexListings: Listing[],
  representativeArea: number,
  tolerance = AREA_TOLERANCE,
): AskingListingsForBracket {
  const inBracket = complexListings.filter(
    (listing) =>
      listing.exclusiveArea > 0 &&
      Math.abs(listing.exclusiveArea - representativeArea) <= tolerance,
  );

  const saleListings: AskingSaleListing[] = inBracket
    .filter((listing) => listing.transactionType === "매매")
    .map((listing) => ({
      id: listing.id,
      priceLabel: listing.priceLabel,
      floor: listing.floor,
      exclusiveArea: listing.exclusiveArea,
    }))
    .sort((a, b) => a.priceLabel.localeCompare(b.priceLabel, "ko"));

  return {
    saleListings,
    jeonseCount: inBracket.filter((listing) => listing.transactionType === "전세").length,
    wolseCount: inBracket.filter((listing) => listing.transactionType === "월세").length,
  };
}
