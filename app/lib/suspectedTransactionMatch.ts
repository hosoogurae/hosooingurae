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

// ============================================================================
// 2026-10-20 조사로 추가된 조건 — 왜 있는지, 왜 이렇게 좁은지
//
// 이 조건들이 생기기 전에는(단지코드 + 면적±0.5㎡ + 층 일치 + 가격±10%만
// 썼을 때) 대상 134건 중 95건(71%)이 "거래 의심"으로 떴습니다. 아무도
// 안 볼 만큼 많았고, 그중 67건이 "호수마을e편한세상2단지 85㎡" 단
// 하나의 조합이었습니다. 그런데 그 조합은 12개월 실거래가 43건뿐이라
// 산수가 안 맞았습니다 — 거래 43건으로 67채가 팔렸을 리 없습니다.
// 원인은 그 조합에 같은 면적·같은 층 매물이 우리 쪽에 여러 채 있어서,
// 거래 하나가 우리 매물 여러 개를 동시에 지목했기 때문입니다(실측:
// 거래 1건이 매물 19개를 지목한 경우도 있었음).
//
// ⚠️ 아래 두 조건은 "정확하게 맞히기" 위한 게 아니라 "구별할 수 없으면
// 말하지 않기" 위한 것입니다. 일부러 좁게 잡았고, 그래서 실제로 팔린
// 매물을 놓칠 수 있습니다(재현율을 포기하고 정밀도를 택함). 이 주석을
// 보고 "왜 이렇게 좁지, 더 많이 잡아야 하는 거 아닌가" 하며 조건을
// 풀면 71%짜리 노이즈로 되돌아갑니다. 풀기 전에 반드시 실제 비율을
// 다시 재보세요.
// ============================================================================

/**
 * (가) 거래 계약일이 이 매물의 last_verified_at보다 "뒤"일 때만 인정합니다.
 * 집주인이 "아직 있다"고 확인한 날 이전에 난 거래는 이 매물과 무관합니다
 * (그 집이 아니라 같은 단지·같은 평형의 다른 집이 팔린 것).
 *
 * 경계(같은 날): 거래일과 last_verified_at이 같은 날이면 "뒤"로 보지
 * 않습니다(제외). 같은 날 안에서는 확인이 거래보다 먼저인지 나중인지
 * 알 수 없어서, 모호하면 말하지 않는다는 원칙대로 제외 쪽을 택했습니다.
 */
function isTradeAfterLastVerified(listing: Listing, trade: MolitAptTradeItem): boolean {
  if (!listing.lastVerifiedAt) return false;
  return trade.dealDate > listing.lastVerifiedAt.slice(0, 10);
}

/** (나)에서 "같은 유닛"으로 취급할 기준. 전용면적은 ±0.5㎡ 허용 오차와
 *  맞춰 정수로 반올림합니다(84.64㎡와 84.71㎡는 같은 평형으로 봄). */
function unitGroupKey(listing: Listing): string {
  return `${listing.complexId}__${Math.round(listing.exclusiveArea)}__${listing.floor}`;
}

/**
 * (나) 같은 단지·같은 전용면적(±0.5㎡ 버킷)·같은 층 조합에 우리 매물이
 * 1건뿐일 때만 인정합니다. 2건 이상이면 거래 하나가 그 집들 중 어느
 * 쪽인지 구별할 수 없고, 구별 못 하는 걸 지목하면 그게 바로 노이즈입니다.
 * 비교 대상은 "이번에 검사하는 전체 매물"(매매·advertising/negotiating) —
 * 이미 거래완료·보류된 매물은 어차피 전화할 대상이 아니라서 뺍니다.
 */
function hasUniqueUnitInComplex(listing: Listing, listingsInComplex: Listing[]): boolean {
  const key = unitGroupKey(listing);
  return listingsInComplex.filter((l) => unitGroupKey(l) === key).length === 1;
}

export function findSuspectedMatchesForComplex(
  listings: Listing[],
  complexTrades: MolitAptTradeItem[],
): SuspectedMatch[] {
  const results: SuspectedMatch[] = [];
  for (const listing of listings) {
    if (!isEligibleForSuspectedMatchCheck(listing) || listing.price <= 0) continue;
    if (!hasUniqueUnitInComplex(listing, listings)) continue; // (나)
    const uniqueTrades = new Map<string, MolitAptTradeItem>();
    for (const trade of complexTrades) {
      if (isCanceledTrade(trade)) continue;
      if (!isTradeAfterLastVerified(listing, trade)) continue; // (가)
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
