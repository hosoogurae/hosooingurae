import type { FloorPlanImage } from "../data/floorPlans";
import { getAllComplexes } from "./complexes";
import { AREA_MATCH_TOLERANCE, getFloorPlanImagesByComplex, getFloorPlanUnitTypesByComplex } from "./floorPlans";
import { getAllListings } from "./listings";
import { matchesInspectionCategory } from "./listingInspection";

/**
 * /admin/listing-inspection의 "평형타입 또는 평면도 연결이 부족한 매물"을
 * 일괄로 검토·연결하는 화면(floor-plan-cleanup) 전용 데이터 계산입니다.
 * 자동으로 연결하지는 않습니다 — 면적으로 후보가 정확히 1개로 좁혀질 때만
 * 화면에서 기본 체크해두고, 그 외에는 사람이 직접 고르게 합니다.
 */

export type FloorPlanCleanupReason =
  | "no-floor-plans"
  | "floor-plans-missing-area"
  | "listing-area-unknown"
  | "no-area-match"
  | "ambiguous";

export const FLOOR_PLAN_CLEANUP_REASON_LABELS: Record<FloorPlanCleanupReason, string> = {
  "no-floor-plans": "이 단지에 등록된 평면도가 없습니다",
  "floor-plans-missing-area": "평면도에 면적 정보가 없어 비교할 수 없습니다",
  "listing-area-unknown": "이 매물의 면적 정보가 없습니다",
  "no-area-match": "면적이 일치하는 평면도가 없습니다",
  ambiguous: "확인 필요",
};

export interface FloorPlanDropdownOption {
  unitType: string;
  exclusiveArea?: number;
  supplyArea?: number;
}

export interface FloorPlanCleanupRow {
  listingId: string;
  priceLabel: string;
  building: string;
  floor: number;
  complexId: string;
  complexName: string;
  exclusiveArea: number;
  supplyArea: number;
  /** 그 단지에 등록된 전체 평면도 타입(면적 가까운 순). "해당 없음"은 화면에서 별도로 추가합니다. */
  dropdownOptions: FloorPlanDropdownOption[];
  /** 후보가 정확히 1개일 때만 채워집니다(자동 체크 대상). */
  suggestedUnitType: string | null;
  /** suggestedUnitType이 있을 때만: 그 근거(일치한 면적)를 사람이 읽을 문장으로. */
  suggestionReasonLabel: string | null;
  /** suggestedUnitType이 없을 때만: 왜 없는지. */
  reason: FloorPlanCleanupReason | null;
  /** ambiguous일 때 후보 개수(문구에 "후보 2개"처럼 쓰기 위함). */
  ambiguousCandidateCount: number;
}

function findAreaMatches(
  images: FloorPlanImage[],
  exclusiveArea: number,
  supplyArea: number,
): FloorPlanImage[] {
  const byUnitType = new Map<string, FloorPlanImage>();
  for (const image of images) {
    if (image.exclusiveArea === undefined || image.supplyArea === undefined) continue;
    if (Math.abs(image.exclusiveArea - exclusiveArea) > AREA_MATCH_TOLERANCE) continue;
    if (Math.abs(image.supplyArea - supplyArea) > AREA_MATCH_TOLERANCE) continue;
    // 같은 타입에 사진이 여러 장이면 첫 번째 것만 대표로 남깁니다(후보는 타입 단위).
    if (!byUnitType.has(image.unitType)) byUnitType.set(image.unitType, image);
  }
  return Array.from(byUnitType.values());
}

function buildDropdownOptions(images: FloorPlanImage[]): FloorPlanDropdownOption[] {
  const byUnitType = new Map<string, FloorPlanDropdownOption>();
  for (const image of images) {
    if (byUnitType.has(image.unitType)) continue;
    byUnitType.set(image.unitType, {
      unitType: image.unitType,
      exclusiveArea: image.exclusiveArea,
      supplyArea: image.supplyArea,
    });
  }
  return Array.from(byUnitType.values()).sort((a, b) =>
    a.unitType.localeCompare(b.unitType, "ko"),
  );
}

/** 이 단지의 평면도 중 전용·공급면적이 하나라도 둘 다 채워진 게 있는지. */
function hasAnyFloorPlanWithArea(images: FloorPlanImage[]): boolean {
  return images.some(
    (image) => image.exclusiveArea !== undefined && image.supplyArea !== undefined,
  );
}

/** 순수 함수 — 이미 조회된 매물 한 건 + 그 단지의 평면도 목록으로 한 행을 계산합니다. 테스트는 이 함수를 직접 씁니다. */
export function buildFloorPlanCleanupRow(
  listing: {
    id: string;
    priceLabel: string;
    building: string;
    floor: number;
    complexId: string;
    exclusiveArea: number;
    supplyArea: number;
  },
  complexName: string,
  images: FloorPlanImage[],
): FloorPlanCleanupRow {
  const base = {
    listingId: listing.id,
    priceLabel: listing.priceLabel,
    building: listing.building,
    floor: listing.floor,
    complexId: listing.complexId,
    complexName,
    exclusiveArea: listing.exclusiveArea,
    supplyArea: listing.supplyArea,
    dropdownOptions: buildDropdownOptions(images),
  };

  if (listing.exclusiveArea <= 0 || listing.supplyArea <= 0) {
    return {
      ...base,
      suggestedUnitType: null,
      suggestionReasonLabel: null,
      reason: "listing-area-unknown",
      ambiguousCandidateCount: 0,
    };
  }

  if (images.length === 0) {
    return {
      ...base,
      suggestedUnitType: null,
      suggestionReasonLabel: null,
      reason: "no-floor-plans",
      ambiguousCandidateCount: 0,
    };
  }

  if (!hasAnyFloorPlanWithArea(images)) {
    return {
      ...base,
      suggestedUnitType: null,
      suggestionReasonLabel: null,
      reason: "floor-plans-missing-area",
      ambiguousCandidateCount: 0,
    };
  }

  const matches = findAreaMatches(images, listing.exclusiveArea, listing.supplyArea);

  if (matches.length === 0) {
    return {
      ...base,
      suggestedUnitType: null,
      suggestionReasonLabel: null,
      reason: "no-area-match",
      ambiguousCandidateCount: 0,
    };
  }

  if (matches.length >= 2) {
    return {
      ...base,
      suggestedUnitType: null,
      suggestionReasonLabel: null,
      reason: "ambiguous",
      ambiguousCandidateCount: matches.length,
    };
  }

  const [match] = matches;
  return {
    ...base,
    suggestedUnitType: match.unitType,
    suggestionReasonLabel: `전용 ${match.exclusiveArea} · 공급 ${match.supplyArea} 일치`,
    reason: null,
    ambiguousCandidateCount: 0,
  };
}

/**
 * "no-floorplan" 카테고리에 걸리는 아파트 매물 전체를 단지별로 묶어 조회한
 * 뒤, 단지마다 평면도 목록을 한 번씩만 불러와(N+1 방지) 행을 만듭니다.
 * 상가는 애초에 평면도 개념이 없어 대상에서 제외합니다.
 */
export async function getFloorPlanCleanupRows(): Promise<FloorPlanCleanupRow[]> {
  const [listings, unitTypesByComplex, complexes] = await Promise.all([
    getAllListings({ includeDrafts: true }),
    getFloorPlanUnitTypesByComplex(),
    getAllComplexes(),
  ]);

  const complexNameById = new Map(complexes.map((complex) => [complex.id, complex.name]));

  const targetListings = listings.filter(
    (listing) =>
      listing.propertyType === "아파트" &&
      listing.complexId &&
      matchesInspectionCategory(listing, "no-floorplan", unitTypesByComplex),
  );

  const complexIds = [...new Set(targetListings.map((listing) => listing.complexId))];
  const imagesByComplexId = new Map(
    await Promise.all(
      complexIds.map(
        async (complexId) =>
          [complexId, await getFloorPlanImagesByComplex(complexId)] as const,
      ),
    ),
  );

  return targetListings.map((listing) =>
    buildFloorPlanCleanupRow(
      listing,
      complexNameById.get(listing.complexId) ?? "(알 수 없는 단지)",
      imagesByComplexId.get(listing.complexId) ?? [],
    ),
  );
}
