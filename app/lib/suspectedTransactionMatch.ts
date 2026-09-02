import type { Listing } from "../data/listings";
import { isCanceledTrade, type MolitAptTradeItem } from "./molit";

export const SUSPECTED_AREA_TOLERANCE_SQM = 0.5;
export const SUSPECTED_PRICE_TOLERANCE_RATIO = 0.1;

export interface SuspectedMatch {
  matchKey: string;
  listingId: string;
  confidence: "high";
  aptNm: string;
  transactionType: "매매";
  dealDate: string;
  dealAmount: number;
  floor: number;
  exclusiveArea: number;
  aptDong: string;
  cdealType: string;
  priceDifferencePercent: number;
  reason: string;
}

export function isEligibleForSuspectedMatchCheck(listing: Listing): boolean {
  return listing.transactionType === "매매" &&
    (listing.dealStatus === "advertising" || listing.dealStatus === "negotiating");
}

export function buildSuspectedMatchKey(listingId: string, trade: MolitAptTradeItem): string {
  return [listingId, trade.aptSeq, trade.dealDate, trade.dealAmount, trade.excluUseAr,
    trade.floor, trade.aptDong].join("|");
}

export function findSuspectedMatchesForComplex(
  listings: Listing[],
  complexTrades: MolitAptTradeItem[],
): SuspectedMatch[] {
  const results: SuspectedMatch[] = [];
  for (const listing of listings) {
    if (!isEligibleForSuspectedMatchCheck(listing) || listing.price <= 0) continue;
    const uniqueTrades = new Map<string, MolitAptTradeItem>();
    for (const trade of complexTrades) {
      if (isCanceledTrade(trade)) continue;
      const key = buildSuspectedMatchKey(listing.id, trade);
      if (!uniqueTrades.has(key)) uniqueTrades.set(key, trade);
    }
    const candidates = [...uniqueTrades.values()].filter((trade) => {
      if (Math.abs(trade.excluUseAr - listing.exclusiveArea) > SUSPECTED_AREA_TOLERANCE_SQM) return false;
      if (listing.floor > 0 && trade.floor > 0 && listing.floor !== trade.floor) return false;
      if (trade.dealAmount <= 0) return false;
      return Math.abs(trade.dealAmount - listing.price) / listing.price <= SUSPECTED_PRICE_TOLERANCE_RATIO;
    });
    if (candidates.length === 0) continue;
    const best = [...candidates].sort((a, b) => b.dealDate.localeCompare(a.dealDate))[0];
    results.push({
      matchKey: buildSuspectedMatchKey(listing.id, best),
      listingId: listing.id,
      confidence: "high",
      aptNm: best.aptNm,
      transactionType: "매매",
      dealDate: best.dealDate,
      dealAmount: best.dealAmount,
      floor: best.floor,
      exclusiveArea: best.excluUseAr,
      aptDong: best.aptDong,
      cdealType: best.cdealType,
      priceDifferencePercent: Math.abs(best.dealAmount - listing.price) / listing.price * 100,
      reason: "단지·거래유형·면적·층·가격이 유사하여 감지됨",
    });
  }
  return results;
}

/** 이전 시각 기반 확인 데이터와의 하위 호환용입니다. 신규 확인은 matchKey 단위로 저장합니다. */
export function isSuspectedMatchActive(match: SuspectedMatch, acknowledgedAt: string | undefined): boolean {
  if (!acknowledgedAt) return true;
  return new Date(match.dealDate).getTime() > new Date(acknowledgedAt).getTime();
}
