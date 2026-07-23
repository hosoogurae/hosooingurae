import type { ComplexTransportation } from "../../data/complexes";
import type { ListingWithComplex } from "../listings";
import type { ParsedQuery } from "./queryParser";

export interface RankedListing {
  listing: ListingWithComplex;
  /** 0~100. 사용자가 실제로 언급한 조건만 반영한 백분율입니다. */
  score: number;
  /** 실제 매물 데이터를 그대로 인용한 추천 이유 문장들. */
  reasons: string[];
  /** "역 거리 정보 없음"처럼, 요청한 조건인데 단지에 그 데이터 자체가 없을 때 보여줄 안내. */
  notes: string[];
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
  /** 이 단지에 해당 조건을 판단할 데이터 자체가 없어("모름") 0점 처리된 경우. */
  note?: string;
}

const WEIGHTS = {
  propertyType: 20,
  transactionType: 20,
  price: 25,
  complexName: 20,
  roomCount: 10,
  floorTier: 10,
  moveIn: 5,
  station: 15,
  school: 10,
  parking: 10,
  largeComplex: 10,
} as const;

/** 역 도보 시간 기준: 10분 이하 완전만족, 11~15분 부분만족, 16분 이상 불만족. */
const STATION_WALK_FULL_MAX_MINUTES = 10;
const STATION_WALK_PARTIAL_MAX_MINUTES = 15;

const LARGE_COMPLEX_FULL_HOUSEHOLDS = 1000;
const LARGE_COMPLEX_PARTIAL_MIN_HOUSEHOLDS = 700;

const AMPLE_PARKING_FULL_RATIO = 1.3;
const AMPLE_PARKING_PARTIAL_MIN_RATIO = 1.1;

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

type StationEvaluation =
  | { kind: "unknown" }
  | { kind: "mismatch" }
  | { kind: "scored"; score: number; subway: string; walkMinutes: number };

/**
 * 역 근접 여부를 판단합니다. 특정 역을 요청했는데 이 단지의 등록된 역이
 * 다르면(예: 요청 "구래역", 단지는 "마산역") "모름"이 아니라 명확한 불일치로
 * 처리합니다 — 실제로 알고 있는 정보이기 때문입니다. 역 자체가 없거나 도보
 * 시간이 입력되지 않은 단지만 "모름"입니다(0점 처리하되 사유는 만들지 않음).
 */
function evaluateStation(
  transportation: ComplexTransportation,
  requestedStationName: string | undefined,
): StationEvaluation {
  const { subway, subwayWalkMinutes } = transportation;

  if (requestedStationName && subway && subway !== requestedStationName) {
    return { kind: "mismatch" };
  }
  if (!subway || subwayWalkMinutes === undefined) {
    return { kind: "unknown" };
  }

  let score: number;
  if (subwayWalkMinutes <= STATION_WALK_FULL_MAX_MINUTES) {
    score = 1;
  } else if (subwayWalkMinutes <= STATION_WALK_PARTIAL_MAX_MINUTES) {
    score =
      (STATION_WALK_PARTIAL_MAX_MINUTES + 1 - subwayWalkMinutes) /
      (STATION_WALK_PARTIAL_MAX_MINUTES + 1 - STATION_WALK_FULL_MAX_MINUTES);
  } else {
    score = 0;
  }

  return { kind: "scored", score, subway, walkMinutes: subwayWalkMinutes };
}

function schoolCriterion(
  nearbySchools: string[],
  level: NonNullable<ParsedQuery["schoolLevel"]>,
): { score: number; matchedSchool?: string; unknown: boolean } {
  if (nearbySchools.length === 0) {
    return { score: 0, unknown: true };
  }
  if (level === "학교") {
    return { score: 1, matchedSchool: nearbySchools[0], unknown: false };
  }
  const matched = nearbySchools.find((name) => name.includes(level));
  return matched
    ? { score: 1, matchedSchool: matched, unknown: false }
    : { score: 0, unknown: false };
}

function parkingCriterion(
  parkingPerHousehold: number | undefined,
): { score: number; unknown: boolean } {
  if (parkingPerHousehold === undefined) return { score: 0, unknown: true };
  if (parkingPerHousehold >= AMPLE_PARKING_FULL_RATIO) {
    return { score: 1, unknown: false };
  }
  if (parkingPerHousehold >= AMPLE_PARKING_PARTIAL_MIN_RATIO) {
    return {
      score:
        (parkingPerHousehold - AMPLE_PARKING_PARTIAL_MIN_RATIO) /
        (AMPLE_PARKING_FULL_RATIO - AMPLE_PARKING_PARTIAL_MIN_RATIO),
      unknown: false,
    };
  }
  return { score: 0, unknown: false };
}

function largeComplexCriterion(
  totalHouseholds: number | undefined,
): { score: number; unknown: boolean } {
  if (totalHouseholds === undefined) return { score: 0, unknown: true };
  if (totalHouseholds >= LARGE_COMPLEX_FULL_HOUSEHOLDS) {
    return { score: 1, unknown: false };
  }
  if (totalHouseholds >= LARGE_COMPLEX_PARTIAL_MIN_HOUSEHOLDS) {
    return {
      score:
        (totalHouseholds - LARGE_COMPLEX_PARTIAL_MIN_HOUSEHOLDS) /
        (LARGE_COMPLEX_FULL_HOUSEHOLDS - LARGE_COMPLEX_PARTIAL_MIN_HOUSEHOLDS),
      unknown: false,
    };
  }
  return { score: 0, unknown: false };
}

function scoreOne(
  listing: ListingWithComplex,
  query: ParsedQuery,
): { score: number; reasons: string[]; notes: string[]; unknownCount: number } {
  const criteria: CriterionScore[] = [];
  let unknownCount = 0;

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

  if (query.wantsStationProximity) {
    const evaluation = evaluateStation(listing.complex.transportation, query.stationName);
    if (evaluation.kind === "unknown") {
      unknownCount += 1;
      criteria.push({ weight: WEIGHTS.station, score: 0, note: "역 거리 정보 없음" });
    } else if (evaluation.kind === "mismatch") {
      criteria.push({ weight: WEIGHTS.station, score: 0 });
    } else {
      criteria.push({
        weight: WEIGHTS.station,
        score: evaluation.score,
        reason:
          evaluation.score >= 0.5
            ? `${evaluation.subway} 도보 약 ${evaluation.walkMinutes}분 거리입니다.`
            : undefined,
      });
    }
  }

  if (query.schoolLevel) {
    const { score, matchedSchool, unknown } = schoolCriterion(
      listing.complex.nearbySchools,
      query.schoolLevel,
    );
    if (unknown) unknownCount += 1;
    criteria.push({
      weight: WEIGHTS.school,
      score,
      reason: matchedSchool ? `${matchedSchool}가 인근 학교로 등록되어 있습니다.` : undefined,
      note: unknown ? "학교 정보 없음" : undefined,
    });
  }

  if (query.wantsAmpleParking) {
    const { score, unknown } = parkingCriterion(listing.complex.parkingPerHousehold);
    if (unknown) unknownCount += 1;
    criteria.push({
      weight: WEIGHTS.parking,
      score,
      reason:
        score >= 0.5
          ? `세대당 주차 ${listing.complex.parkingPerHousehold}대입니다.`
          : undefined,
      note: unknown ? "주차 정보 없음" : undefined,
    });
  }

  if (query.wantsLargeComplex) {
    const { score, unknown } = largeComplexCriterion(listing.complex.totalHouseholds);
    if (unknown) unknownCount += 1;
    criteria.push({
      weight: WEIGHTS.largeComplex,
      score,
      reason:
        score >= 0.5
          ? `${listing.complex.totalHouseholds?.toLocaleString()}세대 규모입니다.`
          : undefined,
      note: unknown ? "세대수 정보 없음" : undefined,
    });
  }

  if (criteria.length === 0) {
    return { score: 0, reasons: [], notes: [], unknownCount: 0 };
  }

  // "모름"인 항목도 분모(totalWeight)에 그대로 포함합니다 — 데이터가 없다고 그
  // 조건을 빼버리면 다른 조건만으로 매치율이 부풀려질 수 있기 때문입니다
  // (예: 역 정보가 없는 매물이 가격만 맞아도 100%로 보이는 문제를 방지).
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const earned = criteria.reduce((sum, c) => sum + c.weight * c.score, 0);
  const score = Math.round((earned / totalWeight) * 100);
  const reasons = criteria
    .map((c) => c.reason)
    .filter((reason): reason is string => Boolean(reason));
  const notes = criteria
    .map((c) => c.note)
    .filter((note): note is string => Boolean(note));

  return { score, reasons, notes, unknownCount };
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
    query.wantsImmediateMoveIn === true ||
    query.wantsStationProximity === true ||
    query.schoolLevel !== undefined ||
    query.wantsAmpleParking === true ||
    query.wantsLargeComplex === true;

  if (!hasCriteria) {
    return { results: [], noCriteriaRecognized: true, hasExactMatch: false };
  }

  const scored = listings.map((listing) => {
    const { score, reasons, notes, unknownCount } = scoreOne(listing, query);
    return { listing, score, reasons, notes, unknownCount };
  });

  // 점수가 같으면(동점) 단지 정보가 더 많이 확인된(모름이 적은) 매물을 위로 올립니다.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.unknownCount - b.unknownCount;
  });

  const results = scored
    .slice(0, limit)
    .map(({ listing, score, reasons, notes }) => ({ listing, score, reasons, notes }));

  return {
    results,
    noCriteriaRecognized: false,
    hasExactMatch: results.length > 0 && results[0].score === 100,
  };
}
