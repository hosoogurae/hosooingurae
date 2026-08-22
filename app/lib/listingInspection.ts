import type { Listing } from "../data/listings";
import { isUnknownListingNumber } from "./format/listingFields";
import { getVerificationUrgency } from "./listingUrgency";

/**
 * 매물 점검 센터의 6개 카테고리 판정 로직. 점검 페이지(카운트)와
 * admin/listings 목록 페이지(필터링) 둘 다 이 파일만 호출해서, 기준이
 * 서로 다른 곳에서 어긋나지 않게 합니다. 서버 전용 의존성(sharp 등)이
 * 없는 client-safe 파일입니다.
 */
export type InspectionCategory =
  | "urgent"
  | "no-photo"
  | "low-info"
  | "missing-fields"
  | "no-floorplan"
  | "draft"
  | "negotiating";

export const INSPECTION_CATEGORY_LABELS: Record<InspectionCategory, string> = {
  urgent: "재확인이 필요한 매물",
  "no-photo": "사진이 없는 공개 매물",
  "low-info": "설명·특징 정보가 부족한 매물",
  "missing-fields": "층수·면적·방 수 미입력 매물",
  "no-floorplan": "평형타입 또는 평면도 연결이 부족한 매물",
  draft: "비공개 매물",
  negotiating: "계약 진행중 매물",
};

/** 우선순위 카테고리(사진 없는 공개 매물, 재확인 필요) — 점검 페이지에서 먼저·강조 표시. */
export const PRIORITY_INSPECTION_CATEGORIES: InspectionCategory[] = [
  "no-photo",
  "urgent",
];

export const INSPECTION_CATEGORIES: InspectionCategory[] = [
  "no-photo",
  "urgent",
  "low-info",
  "missing-fields",
  "no-floorplan",
  "draft",
  "negotiating",
];

const MIN_DESCRIPTION_LENGTH = 10;
const MIN_FEATURES_COUNT = 3;

export function matchesInspectionCategory(
  listing: Listing,
  category: InspectionCategory,
  unitTypesByComplex: Record<string, string[]>,
): boolean {
  switch (category) {
    case "urgent":
      return (
        (listing.dealStatus === "advertising" ||
          listing.dealStatus === "negotiating") &&
        getVerificationUrgency(listing) !== "ok"
      );
    case "no-photo":
      return listing.status === "published" && !listing.image;
    case "low-info":
      return (
        listing.shortDescription.trim().length < MIN_DESCRIPTION_LENGTH ||
        listing.features.length < MIN_FEATURES_COUNT
      );
    case "missing-fields":
      return (
        isUnknownListingNumber(listing.floor) ||
        isUnknownListingNumber(listing.totalFloors) ||
        isUnknownListingNumber(listing.exclusiveArea) ||
        isUnknownListingNumber(listing.supplyArea) ||
        isUnknownListingNumber(listing.roomCount) ||
        isUnknownListingNumber(listing.bathroomCount)
      );
    case "no-floorplan":
      return (
        !listing.unitType ||
        !(unitTypesByComplex[listing.complexId] ?? []).includes(listing.unitType)
      );
    case "draft":
      return listing.status === "draft";
    case "negotiating":
      return listing.dealStatus === "negotiating";
  }
}

export type InspectionCounts = Record<InspectionCategory, number>;

export function countInspectionCategories(
  listings: Listing[],
  unitTypesByComplex: Record<string, string[]>,
): InspectionCounts {
  const counts = {} as InspectionCounts;
  for (const category of INSPECTION_CATEGORIES) {
    counts[category] = listings.filter((listing) =>
      matchesInspectionCategory(listing, category, unitTypesByComplex),
    ).length;
  }
  return counts;
}

/**
 * "설명·특징 부족" 판정 이유를 실제 값 그대로 짧은 문구로 보여줍니다
 * (추측 문구 없이 "설명 8자"/"특징 1개"처럼 사실만 표기).
 */
export function describeLowInfoReason(listing: Listing): string {
  const reasons: string[] = [];
  if (listing.shortDescription.trim().length < MIN_DESCRIPTION_LENGTH) {
    reasons.push(`설명 ${listing.shortDescription.trim().length}자`);
  }
  if (listing.features.length < MIN_FEATURES_COUNT) {
    reasons.push(`특징 ${listing.features.length}개`);
  }
  return reasons.join(" · ");
}

/**
 * floor/totalFloors/exclusiveArea/supplyArea/roomCount/bathroomCount는 DB가
 * NOT NULL이라 원문에서 못 읽으면 0으로 저장됩니다(app/lib/format/listingFields.ts
 * 참고). 손님 화면은 "층 정보 문의" 같은 안내 문구로 처리하지만, 관리자는
 * 반대로 "값이 없다"는 사실을 정확히 알아야 채울 수 있으므로 어떤 항목이
 * 비어있는지 그대로 알려줍니다.
 */
export function describeMissingFieldsReason(listing: Listing): string {
  const reasons: string[] = [];
  if (
    isUnknownListingNumber(listing.floor) ||
    isUnknownListingNumber(listing.totalFloors)
  ) {
    reasons.push("층수 미입력");
  }
  if (
    isUnknownListingNumber(listing.exclusiveArea) ||
    isUnknownListingNumber(listing.supplyArea)
  ) {
    reasons.push("면적 미입력");
  }
  if (
    isUnknownListingNumber(listing.roomCount) ||
    isUnknownListingNumber(listing.bathroomCount)
  ) {
    reasons.push("방/욕실 수 미입력");
  }
  return reasons.join(" · ");
}
