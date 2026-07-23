import type { ListingWithComplex } from "../listings";
import type { ParsedQuery } from "./queryParser";

export interface RankedListing {
  listing: ListingWithComplex;
  /** 0~100. 사용자가 실제로 언급한 조건만 반영한 백분율입니다. */
  score: number;
  /** 실제 매물 데이터를 그대로 인용한 추천 이유 문장들. */
  reasons: string[];
}

export interface RecommendationResult {
  results: RankedListing[];
  /** 인식된 조건이 하나도 없어 추천 자체를 시도하지 않은 경우. */
  noCriteriaRecognized: boolean;
  /** 1위가 요청한 조건을 전부(100%) 만족하는 경우. */
  hasExactMatch: boolean;
}

interface CriterionScore {
  weight: number;
  score: number; // 0~1
  reason?: string;
}

const WEIGHTS = {
  propertyType: 20,
  transactionType: 20,
  price: 25,
  complexName: 20,
  roomCount: 10,
  floorTier: 10,
  moveIn: 5,
} as const;

function priceScore(
  condition: NonNullable<ParsedQuery["price"]>,
  price: number,
): number {
  if (price >= condition.min && (condition.openEnded || price <= condition.max)) {
    return 1;
  }
  const bandWidth = condition.max - condition.min || 10000;
  const distance =
    price < condition.min ? condition.min - price : price - condition.max;
  const decayRange = bandWidth * 1.5;
  return Math.max(0, 1 - distance / decayRange);
}

function floorTierScore(
  tier: "high" | "low",
  floor: number,
  totalFloors: number,
): number {
  if (!totalFloors || totalFloors <= 0) return 0;
  const ratio = floor / totalFloors;
  if (tier === "high") {
    if (ratio >= 0.7) return 1;
    if (ratio <= 0.4) return 0;
    return (ratio - 0.4) / 0.3;
  }
  if (ratio <= 0.3) return 1;
  if (ratio >= 0.6) return 0;
  return (0.6 - ratio) / 0.3;
}

function moveInScore(moveInDate: string): number {
  if (moveInDate.includes("즉시")) return 1;
  if (moveInDate.includes("협의")) return 0.5;
  return 0;
}

function roomCountScore(requested: number, actual: number): number {
  if (actual === requested) return 1;
  if (Math.abs(actual - requested) === 1) return 0.5;
  return 0;
}

function scoreOne(
  listing: ListingWithComplex,
  query: ParsedQuery,
): { score: number; reasons: string[] } {
  const criteria: CriterionScore[] = [];

  if (query.propertyType) {
    criteria.push({
      weight: WEIGHTS.propertyType,
      score: listing.propertyType === query.propertyType ? 1 : 0,
    });
  }

  if (query.transactionType) {
    criteria.push({
      weight: WEIGHTS.transactionType,
      score: listing.transactionType === query.transactionType ? 1 : 0,
    });
  }

  if (query.price) {
    const s = priceScore(query.price, listing.price);
    criteria.push({
      weight: WEIGHTS.price,
      score: s,
      reason:
        s >= 0.8
          ? `실거래가 ${listing.priceLabel}으로 예산 범위 안에 있습니다.`
          : s >= 0.5
            ? `실거래가 ${listing.priceLabel}으로 예산과 비교적 가깝습니다.`
            : undefined,
    });
  }

  if (query.complexName) {
    criteria.push({
      weight: WEIGHTS.complexName,
      score: listing.complex.name === query.complexName ? 1 : 0,
    });
  }

  if (query.roomCount !== undefined) {
    const s = roomCountScore(query.roomCount, listing.roomCount);
    criteria.push({
      weight: WEIGHTS.roomCount,
      score: s,
      reason: s >= 0.5 ? `방 ${listing.roomCount}개입니다.` : undefined,
    });
  }

  if (query.floorTier) {
    const s = floorTierScore(query.floorTier, listing.floor, listing.totalFloors);
    criteria.push({
      weight: WEIGHTS.floorTier,
      score: s,
      reason:
        s >= 0.5
          ? `총 ${listing.totalFloors}층 중 ${listing.floor}층 매물입니다.`
          : undefined,
    });
  }

  if (query.wantsImmediateMoveIn) {
    const s = moveInScore(listing.moveInDate);
    criteria.push({
      weight: WEIGHTS.moveIn,
      score: s,
      reason: s > 0 ? `입주가능일: ${listing.moveInDate}` : undefined,
    });
  }

  if (criteria.length === 0) {
    return { score: 0, reasons: [] };
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const earned = criteria.reduce((sum, c) => sum + c.weight * c.score, 0);
  const score = Math.round((earned / totalWeight) * 100);
  const reasons = criteria
    .map((c) => c.reason)
    .filter((reason): reason is string => Boolean(reason));

  return { score, reasons };
}

const DEFAULT_LIMIT = 5;

export function rankListings(
  listings: ListingWithComplex[],
  query: ParsedQuery,
  limit = DEFAULT_LIMIT,
): RecommendationResult {
  const hasCriteria =
    query.propertyType !== undefined ||
    query.transactionType !== undefined ||
    query.price !== undefined ||
    query.complexName !== undefined ||
    query.roomCount !== undefined ||
    query.floorTier !== undefined ||
    query.wantsImmediateMoveIn === true;

  if (!hasCriteria) {
    return { results: [], noCriteriaRecognized: true, hasExactMatch: false };
  }

  const scored = listings.map((listing) => {
    const { score, reasons } = scoreOne(listing, query);
    return { listing, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit);

  return {
    results,
    noCriteriaRecognized: false,
    hasExactMatch: results.length > 0 && results[0].score === 100,
  };
}
