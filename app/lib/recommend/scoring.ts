import type { ComplexTransportation } from "../../data/complexes";
import type { ListingWithComplex } from "../listings";
import { formatPriceFull } from "../transactions";
import type { ParsedQuery, PriceCondition } from "./queryParser";

/**
 * 조건은 두 종류로 나뉩니다(CLAUDE.md "추천 로직" 절 참고).
 * - 필수(hard): 예산 상한(손님이 직접 그은 경계만), 거래유형, 매물종류
 *   → 하나라도 위반하면 결과에서 완전히 제외합니다. 가중치로 다루지 않습니다.
 * - 선호(soft): 단지명, 역세권, 학교, 방 개수, 면적 등
 *   → 하드필터를 통과한 매물끼리 순위를 매기는 데만 씁니다.
 *
 * 화면에는 백분율 점수를 노출하지 않습니다. 내부 가중치 점수는 동점 매물의
 * 정렬 타이브레이커로만 쓰고, RankedListing/NearMissListing 어디에도 담지
 * 않습니다.
 */

export type SoftCriterionKey =
  | "complexName"
  | "roomCount"
  | "floorTier"
  | "moveIn"
  | "station"
  | "school"
  | "parking"
  | "largeComplex"
  | "priceLow"
  | "price";

export interface SoftCriterionResult {
  key: SoftCriterionKey;
  /** 화면에 보여줄 조건 이름. 예: "역세권". */
  label: string;
  /** "N개 조건 중 M개 충족" 카운트에 씁니다. unknown이면 이 값과 무관하게 분모에서 제외됩니다. */
  satisfied: boolean;
  /** 실제 매물 데이터를 인용한, 충족 시 보여줄 근거 문장. */
  reason?: string;
  /** 미충족 시 보여줄 구체적 사유(추측 없이 실제 값만). 화면에는 작고 중립적으로 표시합니다. */
  unmetDetail?: string;
  /** 이 단지에 판단할 데이터 자체가 없어 충족/미충족을 가릴 수 없는 경우. */
  unknown?: boolean;
  /** unknown일 때 보여줄 안내 문구. 예: "역 거리 정보 없음". */
  note?: string;
}

export interface RankedListing {
  listing: ListingWithComplex;
  criteria: SoftCriterionResult[];
  /** unknown을 제외한 조건 중 충족한 개수. */
  satisfiedCount: number;
  /** unknown을 제외한 조건 개수(분모). */
  totalCount: number;
  /** 판단할 데이터가 없어 분모에서 빠진 조건 개수. */
  unknownCount: number;
  /** criteria의 reason만 모은 것(카드 "추천 이유" 문단에 그대로 이어붙이는 용도). */
  reasons: string[];
  /** criteria의 note만 모은 것. */
  notes: string[];
}

/** "over" = 상한 초과, "under" = 하한 미달(양쪽 다 손님이 직접 그은 경계일 때만 발생). */
export interface PriceViolation {
  direction: "over" | "under";
  /** 만원 단위 차액. */
  amountManwon: number;
  /** 화면에 그대로 쓸 문구. 예: "예산 2,500만원 초과". */
  detail: string;
}

export interface NearMissListing extends RankedListing {
  violation: PriceViolation;
}

export interface RecommendationResult {
  results: RankedListing[];
  /**
   * 예산을 살짝 벗어났지만 참고할 만한 매물(별도 섹션 전용, 메인 results와
   * 절대 섞이지 않습니다). 항상 채워서 반환하되, 메인 결과가 충분하면
   * (NEAR_MISS_HIDE_THRESHOLD건 이상) 화면에서 숨길지는 호출부(recommend/page.tsx)가
   * 결정합니다.
   */
  nearMisses: NearMissListing[];
  /** 인식된 조건이 하나도 없어 추천 자체를 시도하지 않은 경우. */
  noCriteriaRecognized: boolean;
  /** 1위가 인식된 소프트 조건을 전부(satisfiedCount === totalCount) 만족하는 경우. */
  hasExactMatch: boolean;
}

interface SoftCriterionEvaluation extends SoftCriterionResult {
  /** 내부 타이브레이커 전용 가중치. 화면에 노출되지 않습니다. */
  weight: number;
  /** 0~1, 내부 타이브레이커 전용 연속 점수. 화면에 노출되지 않습니다. */
  score: number;
}

const WEIGHTS = {
  complexName: 20,
  roomCount: 10,
  floorTier: 10,
  moveIn: 5,
  station: 15,
  school: 10,
  parking: 10,
  largeComplex: 10,
  priceLow: 15,
} as const;

/** 조건 충족 여부를 나눌 때 쓰는 연속 점수 기준(기존 "reason 표시" 기준과 동일하게 맞춤). */
const SATISFIED_SCORE_THRESHOLD = 0.5;

/** 예산 근접초과 허용오차: 상한(또는 하한) 대비 5%, 단 절대금액 3,000만원을 넘지 않습니다. */
const NEAR_MISS_PRICE_TOLERANCE_RATIO = 0.05;
const NEAR_MISS_PRICE_TOLERANCE_CAP_MANWON = 3000;

/** 역 도보 시간 기준: 10분 이하 완전만족, 11~15분 부분만족, 16분 이상 불만족. */
const STATION_WALK_FULL_MAX_MINUTES = 10;
const STATION_WALK_PARTIAL_MAX_MINUTES = 15;

const LARGE_COMPLEX_FULL_HOUSEHOLDS = 1000;
const LARGE_COMPLEX_PARTIAL_MIN_HOUSEHOLDS = 700;

const AMPLE_PARKING_FULL_RATIO = 1.3;
const AMPLE_PARKING_PARTIAL_MIN_RATIO = 1.1;

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
  | { kind: "mismatch"; subway?: string }
  | { kind: "scored"; score: number; subway: string; walkMinutes: number };

/**
 * 역 근접 여부를 판단합니다. 특정 역을 요청했는데 이 단지의 등록된 역이
 * 다르면(예: 요청 "구래역", 단지는 "마산역") "모름"이 아니라 명확한 불일치로
 * 처리합니다 — 실제로 알고 있는 정보이기 때문입니다. 역 자체가 없거나 도보
 * 시간이 입력되지 않은 단지만 "모름"입니다.
 */
function evaluateStationTransport(
  transportation: ComplexTransportation,
  requestedStationName: string | undefined,
): StationEvaluation {
  const { subway, subwayWalkMinutes } = transportation;

  if (requestedStationName && subway && subway !== requestedStationName) {
    return { kind: "mismatch", subway };
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
  // "초등학교"는 정식 명칭 외에 "OO초"처럼 줄여 등록됐을 수도 있어 "초"도
  // 근거로 인정합니다(요청하신 규칙). 실제로 있는 학교 이름만 근거로 쓰고,
  // 추측으로 "학군이 좋다" 같은 판단은 만들지 않습니다.
  const matched = nearbySchools.find(
    (name) => name.includes(level) || (level === "초등학교" && name.includes("초")),
  );
  return matched
    ? { score: 1, matchedSchool: matched, unknown: false }
    : { score: 0, unknown: false };
}

/** 후보 매물 전체의 실거래가 범위. 전부 같은 가격이면(비교 무의미) null. */
function computePriceRange(listings: ListingWithComplex[]): { min: number; max: number } | null {
  if (listings.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const listing of listings) {
    if (listing.price < min) min = listing.price;
    if (listing.price > max) max = listing.price;
  }
  return max > min ? { min, max } : null;
}

/**
 * 가격이 낮을수록 1에 가깝게(후보군 내 상대적 위치). 구체적 금액을 지어내지
 * 않고 실제 값끼리만 비교합니다.
 */
function lowerPriceScore(price: number, range: { min: number; max: number }): number {
  const raw = 1 - (price - range.min) / (range.max - range.min);
  return Math.max(0, Math.min(1, raw));
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

// ── 소프트 조건 평가 함수들 ──────────────────────────────────────────────
// 각 함수는 화면용 SoftCriterionResult와 내부 타이브레이커용 weight/score를
// 한 번에 반환합니다. "충족" 여부는 연속 점수가 SATISFIED_SCORE_THRESHOLD
// 이상인지로 판정합니다(기존 "reason 표시" 기준과 동일).

function evaluateComplexName(
  listing: ListingWithComplex,
  requested: string,
): SoftCriterionEvaluation {
  const satisfied = listing.complex.name === requested;
  return {
    key: "complexName",
    label: "단지명",
    weight: WEIGHTS.complexName,
    score: satisfied ? 1 : 0,
    satisfied,
    // 단지명은 카드 자체에 이미 크게 표시되므로 reason으로 다시 말하지 않습니다(기존과 동일).
    unmetDetail: satisfied ? undefined : `${listing.complex.name}입니다(요청: ${requested}).`,
  };
}

function evaluateRoomCount(
  listing: ListingWithComplex,
  requested: number,
): SoftCriterionEvaluation {
  const score = roomCountScore(requested, listing.roomCount);
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "roomCount",
    label: "방 개수",
    weight: WEIGHTS.roomCount,
    score,
    satisfied,
    reason: satisfied ? `방 ${listing.roomCount}개입니다.` : undefined,
    unmetDetail: satisfied ? undefined : `방 ${listing.roomCount}개입니다(요청 ${requested}개).`,
  };
}

function evaluateFloorTier(
  listing: ListingWithComplex,
  tier: NonNullable<ParsedQuery["floorTier"]>,
): SoftCriterionEvaluation {
  const score = floorTierScore(tier, listing.floor, listing.totalFloors);
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "floorTier",
    label: "층 선호",
    weight: WEIGHTS.floorTier,
    score,
    satisfied,
    reason: satisfied ? `총 ${listing.totalFloors}층 중 ${listing.floor}층 매물입니다.` : undefined,
    unmetDetail: satisfied ? undefined : `총 ${listing.totalFloors}층 중 ${listing.floor}층입니다.`,
  };
}

function evaluateMoveIn(listing: ListingWithComplex): SoftCriterionEvaluation {
  const score = moveInScore(listing.moveInDate);
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "moveIn",
    label: "입주 시기",
    weight: WEIGHTS.moveIn,
    score,
    satisfied,
    reason: satisfied ? `입주가능일: ${listing.moveInDate}` : undefined,
    unmetDetail: satisfied ? undefined : `입주가능일: ${listing.moveInDate}`,
  };
}

function evaluateStationCriterion(
  listing: ListingWithComplex,
  requestedStationName: string | undefined,
): SoftCriterionEvaluation {
  const evaluation = evaluateStationTransport(listing.complex.transportation, requestedStationName);

  if (evaluation.kind === "unknown") {
    return {
      key: "station",
      label: "역세권",
      weight: WEIGHTS.station,
      score: 0,
      satisfied: false,
      unknown: true,
      note: "역 거리 정보 없음",
    };
  }
  if (evaluation.kind === "mismatch") {
    return {
      key: "station",
      label: "역세권",
      weight: WEIGHTS.station,
      score: 0,
      satisfied: false,
      unmetDetail: evaluation.subway
        ? `등록된 역: ${evaluation.subway}(요청: ${requestedStationName}).`
        : undefined,
    };
  }

  const satisfied = evaluation.score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "station",
    label: "역세권",
    weight: WEIGHTS.station,
    score: evaluation.score,
    satisfied,
    reason: satisfied
      ? `${evaluation.subway} 도보 약 ${evaluation.walkMinutes}분 거리입니다.`
      : undefined,
    unmetDetail: satisfied
      ? undefined
      : `${evaluation.subway} 도보 약 ${evaluation.walkMinutes}분입니다.`,
  };
}

function evaluateSchool(
  listing: ListingWithComplex,
  level: NonNullable<ParsedQuery["schoolLevel"]>,
): SoftCriterionEvaluation {
  const { score, matchedSchool, unknown } = schoolCriterion(listing.complex.nearbySchools, level);
  if (unknown) {
    return {
      key: "school",
      label: "학교",
      weight: WEIGHTS.school,
      score: 0,
      satisfied: false,
      unknown: true,
      note: "학교 정보 없음",
    };
  }
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "school",
    label: "학교",
    weight: WEIGHTS.school,
    score,
    satisfied,
    reason: matchedSchool ? `${matchedSchool}가 인근 학교로 등록되어 있습니다.` : undefined,
    unmetDetail: satisfied
      ? undefined
      : `등록된 인근 학교: ${listing.complex.nearbySchools.join(", ")}.`,
  };
}

function evaluateParking(listing: ListingWithComplex): SoftCriterionEvaluation {
  const { score, unknown } = parkingCriterion(listing.complex.parkingPerHousehold);
  if (unknown) {
    return {
      key: "parking",
      label: "주차",
      weight: WEIGHTS.parking,
      score: 0,
      satisfied: false,
      unknown: true,
      note: "주차 정보 없음",
    };
  }
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "parking",
    label: "주차",
    weight: WEIGHTS.parking,
    score,
    satisfied,
    reason: satisfied
      ? `세대당 주차 ${listing.complex.parkingPerHousehold}대입니다.`
      : undefined,
    unmetDetail: satisfied
      ? undefined
      : `세대당 주차 ${listing.complex.parkingPerHousehold}대입니다.`,
  };
}

function evaluateLargeComplex(listing: ListingWithComplex): SoftCriterionEvaluation {
  const { score, unknown } = largeComplexCriterion(listing.complex.totalHouseholds);
  if (unknown) {
    return {
      key: "largeComplex",
      label: "대단지",
      weight: WEIGHTS.largeComplex,
      score: 0,
      satisfied: false,
      unknown: true,
      note: "세대수 정보 없음",
    };
  }
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "largeComplex",
    label: "대단지",
    weight: WEIGHTS.largeComplex,
    score,
    satisfied,
    reason: satisfied
      ? `${listing.complex.totalHouseholds?.toLocaleString()}세대 규모입니다.`
      : undefined,
    unmetDetail: satisfied
      ? undefined
      : `${listing.complex.totalHouseholds?.toLocaleString()}세대입니다.`,
  };
}

function evaluateLowerPrice(
  listing: ListingWithComplex,
  priceRange: { min: number; max: number },
): SoftCriterionEvaluation {
  const score = lowerPriceScore(listing.price, priceRange);
  const satisfied = score >= SATISFIED_SCORE_THRESHOLD;
  return {
    key: "priceLow",
    label: "가격(저렴한 편)",
    weight: WEIGHTS.priceLow,
    score,
    satisfied,
    reason:
      score >= 0.7
        ? `비교한 매물들 중 가격이 낮은 편입니다(실거래가 ${listing.priceLabel}).`
        : undefined,
    unmetDetail: satisfied
      ? undefined
      : `비교한 매물들 중 가격이 높은 편입니다(실거래가 ${listing.priceLabel}).`,
  };
}

/**
 * 월세는 listing.price가 보증금만 담고 있고 query.price는 사용자가 보증금/
 * 월세 중 무엇을 말했는지 구분하지 못합니다(queryParser.ts). 틀린 스케일로
 * 비교해 틀린 순위를 매기느니 아예 판단을 포기하고 "확인 불가"로 집계합니다.
 */
function evaluateMonthlyRentPriceUnknown(): SoftCriterionEvaluation {
  return {
    key: "price",
    label: "가격",
    weight: 0,
    score: 0,
    satisfied: false,
    unknown: true,
    note: "월세는 보증금·월세 구분 전이라 가격 조건을 적용하지 못했습니다",
  };
}

function scoreOne(
  listing: ListingWithComplex,
  query: ParsedQuery,
  priceRange: { min: number; max: number } | null,
): { criteria: SoftCriterionEvaluation[] } {
  const criteria: SoftCriterionEvaluation[] = [];

  if (query.complexName) {
    criteria.push(evaluateComplexName(listing, query.complexName));
  }
  if (query.roomCount !== undefined) {
    criteria.push(evaluateRoomCount(listing, query.roomCount));
  }
  if (query.floorTier) {
    criteria.push(evaluateFloorTier(listing, query.floorTier));
  }
  if (query.wantsImmediateMoveIn) {
    criteria.push(evaluateMoveIn(listing));
  }
  if (query.wantsStationProximity) {
    criteria.push(evaluateStationCriterion(listing, query.stationName));
  }
  if (query.schoolLevel) {
    criteria.push(evaluateSchool(listing, query.schoolLevel));
  }
  if (query.wantsAmpleParking) {
    criteria.push(evaluateParking(listing));
  }
  if (query.wantsLargeComplex) {
    criteria.push(evaluateLargeComplex(listing));
  }

  // "저렴한/싼/가성비" — 구체적 금액 조건(query.price)이 이미 있으면 그게
  // 우선이라 이 기준은 건너뜁니다. 임의의 가격 기준을 만들지 않고, 이번에
  // 순위 매기는 후보 매물들의 실제 가격끼리만 비교합니다. 거래유형이
  // 다르면(매매/전세/월세는 금액 스케일이 달라) 비교 자체를 하지 않습니다.
  const priceComparisonApplies =
    !query.transactionType || listing.transactionType === query.transactionType;
  if (query.wantsLowerPrice && !query.price && priceComparisonApplies && priceRange) {
    criteria.push(evaluateLowerPrice(listing, priceRange));
  }

  if (query.price && listing.transactionType === "월세") {
    criteria.push(evaluateMonthlyRentPriceUnknown());
  }

  return { criteria };
}

function buildRankedListing(
  listing: ListingWithComplex,
  evaluations: SoftCriterionEvaluation[],
): { ranked: RankedListing; internalScore: number } {
  const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
  const earned = evaluations.reduce((sum, e) => sum + e.weight * e.score, 0);
  const internalScore = totalWeight > 0 ? earned / totalWeight : 0;

  const known = evaluations.filter((e) => !e.unknown);
  const satisfiedCount = known.filter((e) => e.satisfied).length;
  const totalCount = known.length;
  const unknownCount = evaluations.length - known.length;

  const criteria: SoftCriterionResult[] = evaluations.map((e) => ({
    key: e.key,
    label: e.label,
    satisfied: e.satisfied,
    reason: e.reason,
    unmetDetail: e.unmetDetail,
    unknown: e.unknown,
    note: e.note,
  }));
  const reasons = criteria.map((c) => c.reason).filter((r): r is string => Boolean(r));
  const notes = criteria.map((c) => c.note).filter((n): n is string => Boolean(n));

  return {
    ranked: { listing, criteria, satisfiedCount, totalCount, unknownCount, reasons, notes },
    internalScore,
  };
}

function compareScored(
  a: { ranked: RankedListing; internalScore: number },
  b: { ranked: RankedListing; internalScore: number },
): number {
  if (b.ranked.satisfiedCount !== a.ranked.satisfiedCount) {
    return b.ranked.satisfiedCount - a.ranked.satisfiedCount;
  }
  if (b.internalScore !== a.internalScore) {
    return b.internalScore - a.internalScore;
  }
  return a.ranked.unknownCount - b.ranked.unknownCount;
}

// ── 하드필터 ──────────────────────────────────────────────────────────

type PriceHardFilterOutcome =
  | { kind: "pass" }
  | { kind: "reject" }
  | { kind: "nearMiss"; violation: PriceViolation };

/**
 * minSource/maxSource가 "constraint"인 경계만 하드필터 대상입니다. "padding"인
 * 경계(파서가 계산 편의로 채운 값)는 하드필터에서 완전히 무시합니다 —
 * queryParser.ts의 PriceCondition 주석 참고.
 */
function evaluatePriceHardFilter(
  condition: PriceCondition,
  price: number,
): PriceHardFilterOutcome {
  if (condition.maxSource === "constraint" && price > condition.max) {
    const amountManwon = price - condition.max;
    const tolerance = Math.min(
      condition.max * NEAR_MISS_PRICE_TOLERANCE_RATIO,
      NEAR_MISS_PRICE_TOLERANCE_CAP_MANWON,
    );
    if (amountManwon <= tolerance) {
      return {
        kind: "nearMiss",
        violation: {
          direction: "over",
          amountManwon,
          detail: `예산 ${formatPriceFull(amountManwon)} 초과`,
        },
      };
    }
    return { kind: "reject" };
  }

  if (condition.minSource === "constraint" && price < condition.min) {
    const amountManwon = condition.min - price;
    const tolerance = Math.min(
      condition.min * NEAR_MISS_PRICE_TOLERANCE_RATIO,
      NEAR_MISS_PRICE_TOLERANCE_CAP_MANWON,
    );
    if (amountManwon <= tolerance) {
      return {
        kind: "nearMiss",
        violation: {
          direction: "under",
          amountManwon,
          detail: `예산 ${formatPriceFull(amountManwon)} 부족`,
        },
      };
    }
    return { kind: "reject" };
  }

  return { kind: "pass" };
}

const DEFAULT_LIMIT = 5;
const DEFAULT_NEAR_MISS_LIMIT = 3;

/**
 * 메인 results가 이 건수 이상이면 nearMisses를 화면에서 숨깁니다(데이터는
 * 항상 반환 — 표시 여부만 recommend/page.tsx가 이 값을 기준으로 결정).
 * 조건에 맞는 매물이 넉넉한데 예산 초과 매물을 권할 이유가 없습니다.
 */
export const NEAR_MISS_HIDE_THRESHOLD = 5;

export function rankListings(
  listings: ListingWithComplex[],
  query: ParsedQuery,
  limit = DEFAULT_LIMIT,
  nearMissLimit = DEFAULT_NEAR_MISS_LIMIT,
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
    query.wantsLargeComplex === true ||
    query.wantsLowerPrice === true;

  if (!hasCriteria) {
    return { results: [], nearMisses: [], noCriteriaRecognized: true, hasExactMatch: false };
  }

  // 1) 하드필터. propertyType/거래유형 불일치는 완전 제외(참고용에도 노출
  // 안 함). 예산은 통과/근접초과 후보/완전제외 세 갈래로 나뉩니다. 월세는
  // listing.price(보증금)와 query.price(사용자가 보증금/월세 중 뭘 말했는지
  // 구분 못 함)의 스케일이 다를 수 있어 예산 하드필터를 아예 건너뜁니다.
  const passed: ListingWithComplex[] = [];
  const nearMissCandidates: { listing: ListingWithComplex; violation: PriceViolation }[] = [];

  for (const listing of listings) {
    if (query.propertyType && listing.propertyType !== query.propertyType) continue;
    if (query.transactionType && listing.transactionType !== query.transactionType) continue;

    if (query.price && listing.transactionType !== "월세") {
      const outcome = evaluatePriceHardFilter(query.price, listing.price);
      if (outcome.kind === "reject") continue;
      if (outcome.kind === "nearMiss") {
        nearMissCandidates.push({ listing, violation: outcome.violation });
        continue;
      }
    }

    passed.push(listing);
  }

  // 매매가/전세보증금/월세보증금은 성격이 달라 그대로 섞어 비교하면 "저렴한
  // 편"이 왜곡됩니다. 거래유형을 지정했으면 같은 유형끼리만, 안 정했으면
  // (모호함은 사용자 몫) 통과한 전체끼리 비교합니다.
  const priceComparisonPool = query.transactionType
    ? passed.filter((listing) => listing.transactionType === query.transactionType)
    : passed;
  const priceRange = computePriceRange(priceComparisonPool);

  const scored = passed.map((listing) => {
    const { criteria } = scoreOne(listing, query, priceRange);
    return buildRankedListing(listing, criteria);
  });
  scored.sort(compareScored);
  const results = scored.slice(0, limit).map((s) => s.ranked);

  const scoredNearMisses = nearMissCandidates.map(({ listing, violation }) => {
    const { criteria } = scoreOne(listing, query, priceRange);
    const { ranked } = buildRankedListing(listing, criteria);
    return { ...ranked, violation };
  });
  // "예산 초과/부족분이 적은 순" — nearMisses는 소프트 점수가 아니라 예산에
  // 얼마나 가까운지로 정렬합니다(참고용 목록의 목적 자체가 그것이므로).
  scoredNearMisses.sort((a, b) => a.violation.amountManwon - b.violation.amountManwon);
  const nearMisses = scoredNearMisses.slice(0, nearMissLimit);

  const top = results[0];
  const hasExactMatch = top !== undefined && top.satisfiedCount === top.totalCount;

  return { results, nearMisses, noCriteriaRecognized: false, hasExactMatch };
}
