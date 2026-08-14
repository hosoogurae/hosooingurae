import type { Listing } from "../data/listings";
import type { MolitAptTradeItem } from "./molit";

export type MatchConfidence = "high" | "low";

export interface SuspectedMatch {
  listingId: string;
  confidence: MatchConfidence;
  dealDate: string;
  /** 만원 단위. */
  dealAmount: number;
  floor: number;
  exclusiveArea: number;
}

/** 같은 평형으로 볼 전용면적 오차 허용 범위(㎡). app/api/transactions의 AREA_TOLERANCE와 같은 기준입니다. */
const AREA_TOLERANCE = 0.5;

/**
 * 국토부 API 자체가 매매 실거래만 다루므로 전세/월세는 애초에 비교 대상이
 * 아니고, 이미 계약완료/보류로 표시한 매물은 다시 알릴 필요가 없습니다.
 */
export function isEligibleForSuspectedMatchCheck(listing: Listing): boolean {
  return (
    listing.transactionType === "매매" &&
    (listing.dealStatus === "advertising" || listing.dealStatus === "negotiating")
  );
}

/**
 * 한 단지에 속한 매물들(이미 isEligibleForSuspectedMatchCheck를 통과한 것만
 * 넘겨야 함)과 그 단지의 실거래 목록(이미 aptSeq로 그 단지 것만 걸러 넘겨야
 * 함)을 비교해, 매물별로 가장 최근에 매칭된 거래 하나를 찾습니다.
 *
 * 층까지 일치하면 신뢰도 high, 전용면적(±0.5㎡)만 일치하면 low입니다.
 * 매칭되는 거래가 없으면 결과에서 빠집니다 — "확정이 아니라 의심"이므로
 * 애매하면 아예 표시하지 않습니다(허위 경보 최소화).
 */
export function findSuspectedMatchesForComplex(
  listings: Listing[],
  complexTrades: MolitAptTradeItem[],
): SuspectedMatch[] {
  const results: SuspectedMatch[] = [];

  for (const listing of listings) {
    const areaMatches = complexTrades.filter(
      (trade) => Math.abs(trade.excluUseAr - listing.exclusiveArea) <= AREA_TOLERANCE,
    );
    if (areaMatches.length === 0) continue;

    const floorMatches = areaMatches.filter((trade) => trade.floor === listing.floor);
    const candidates = floorMatches.length > 0 ? floorMatches : areaMatches;
    const best = [...candidates].sort((a, b) => b.dealDate.localeCompare(a.dealDate))[0];

    results.push({
      listingId: listing.id,
      confidence: floorMatches.length > 0 ? "high" : "low",
      dealDate: best.dealDate,
      dealAmount: best.dealAmount,
      floor: best.floor,
      exclusiveArea: best.excluUseAr,
    });
  }

  return results;
}

/**
 * 관리자가 "확인함"을 누른 시각(acknowledgedAt) 이후 날짜의 거래가 아니면
 * (=이미 확인했던 바로 그 거래면) 배지를 다시 띄우지 않습니다. acknowledgedAt
 * 이후 새 거래가 나타나면 다시 활성화됩니다.
 */
export function isSuspectedMatchActive(
  match: SuspectedMatch,
  acknowledgedAt: string | undefined,
): boolean {
  if (!acknowledgedAt) return true;
  return new Date(match.dealDate).getTime() > new Date(acknowledgedAt).getTime();
}
