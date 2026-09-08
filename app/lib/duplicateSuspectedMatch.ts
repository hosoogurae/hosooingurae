import type { TransactionType } from "../data/listings";
import type { ListingWithComplex } from "./listings";

/**
 * "강함": 단지·동·층·거래유형·공급면적·전용면적이 모두 같음.
 * "약함": 단지·동·층·거래유형은 같은데 면적이 다름(같은 층 다른 호수일 수 있음).
 * "층미상": 둘 중 하나(또는 둘 다) 층 정보가 없어서 층을 비교하지 못했지만,
 *   단지·동·거래유형·면적은 같음 — 층을 몰라 중복이 숨기 좋은 자리라 별도로 봅니다.
 * 셋 다 "의심"이며 자동 확정이 아닙니다. 화면에서 이 순서로 먼저 보여줍니다.
 */
export type DuplicateSuspectSeverity = "strong" | "weak" | "floor-unknown";

export interface DuplicateSuspectListing {
  id: string;
  priceLabel: string;
  supplyArea: number;
  exclusiveArea: number;
  floor: number;
  totalFloors: number;
  direction: string;
  features: string[];
  shortDescription: string;
  /** 최초 등록일(created_at). */
  registeredAt?: string;
  lastVerifiedAt?: string;
  editUrl: string;
}

export interface DuplicateSuspectGroup {
  key: string;
  severity: DuplicateSuspectSeverity;
  complexName: string;
  building: string;
  /** strong/weak 그룹만 값이 있습니다. floor-unknown 그룹은 층이 제각각(또는 미상)이라 비워둡니다. */
  floor?: number;
  transactionType: TransactionType;
  listings: DuplicateSuspectListing[];
}

export interface DuplicateSuspectResult {
  groups: DuplicateSuspectGroup[];
  /** 단지·동 정보 자체가 없어 그룹핑을 시도조차 못 한 매물 수(화면에 한 줄로 안내). */
  excludedMissingBuildingCount: number;
}

/** findNaverDuplicate/findMatchingUnitTypes와 같은 기준(±0.05㎡). */
const AREA_TOLERANCE_SQM = 0.05;

function areasMatch(a: ListingWithComplex, b: ListingWithComplex): boolean {
  return (
    Math.abs(a.supplyArea - b.supplyArea) <= AREA_TOLERANCE_SQM &&
    Math.abs(a.exclusiveArea - b.exclusiveArea) <= AREA_TOLERANCE_SQM
  );
}

function hasBuilding(listing: ListingWithComplex): boolean {
  return Boolean(listing.building && listing.building.trim() !== "");
}

function buildingKey(listing: ListingWithComplex): string {
  return `${listing.complexId}|${listing.building}|${listing.transactionType}`;
}

function toDuplicateSuspectListing(
  listing: ListingWithComplex,
): DuplicateSuspectListing {
  return {
    id: listing.id,
    priceLabel: listing.priceLabel,
    supplyArea: listing.supplyArea,
    exclusiveArea: listing.exclusiveArea,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    direction: listing.direction,
    features: listing.features,
    shortDescription: listing.shortDescription,
    registeredAt: listing.createdAt,
    lastVerifiedAt: listing.lastVerifiedAt,
    editUrl: `/admin/listings/${listing.id}/edit`,
  };
}

function toGroup(
  key: string,
  severity: DuplicateSuspectSeverity,
  members: ListingWithComplex[],
): DuplicateSuspectGroup {
  const first = members[0];
  const sameFloor = members.every((m) => m.floor === first.floor && m.floor > 0);
  return {
    key,
    severity,
    complexName: first.complex.name,
    building: first.building,
    floor: sameFloor ? first.floor : undefined,
    transactionType: first.transactionType,
    listings: members
      .slice()
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
      .map(toDuplicateSuspectListing),
  };
}

/**
 * 공개 매물끼리 "이미 등록된 매물이 또 등록된 것 같다"는 의심 그룹을 찾습니다.
 * 사람이 눈으로 확인하는 안전망입니다 — 자동으로 합치거나 지우지 않고,
 * 무엇이 겹쳤는지만 보여줍니다. 같은 층에도 여러 호수가 있을 수 있으므로
 * "강함"이어도 확정이 아닙니다.
 */
export function findDuplicateSuspectGroups(
  allListings: ListingWithComplex[],
): DuplicateSuspectResult {
  const published = allListings.filter((listing) => listing.status === "published");
  const withBuilding = published.filter(hasBuilding);
  const excludedMissingBuildingCount = published.length - withBuilding.length;

  const groups: DuplicateSuspectGroup[] = [];

  // 1) 층을 아는 매물끼리: 단지·동·층·거래유형으로 묶고, 면적까지 같은 쌍이
  // 있으면 강함, 없으면(면적이 다름) 약함.
  const floorKnown = withBuilding.filter((listing) => listing.floor > 0);
  const floorBuckets = new Map<string, ListingWithComplex[]>();
  for (const listing of floorKnown) {
    const key = `${buildingKey(listing)}|${listing.floor}`;
    const bucket = floorBuckets.get(key) ?? [];
    bucket.push(listing);
    floorBuckets.set(key, bucket);
  }
  for (const [key, bucket] of floorBuckets) {
    if (bucket.length < 2) continue;
    let severity: DuplicateSuspectSeverity = "weak";
    outer: for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        if (areasMatch(bucket[i], bucket[j])) {
          severity = "strong";
          break outer;
        }
      }
    }
    groups.push(toGroup(key, severity, bucket));
  }

  // 2) 층을 모르는 매물(또는 상대가 층을 모르는 경우): 단지·동·거래유형까지만
  // 묶고, 면적이 같은 쌍만 "층미상" 의심으로 봅니다. 층이 둘 다 있고 서로
  // 다르면 이미 다른 집으로 확인된 것이니 여기서 제외합니다(1번이 그 경우를
  // strong/weak로 이미 처리했거나, 애초에 다른 층이라 의심 대상이 아닙니다).
  const buildingBuckets = new Map<string, ListingWithComplex[]>();
  for (const listing of withBuilding) {
    const key = buildingKey(listing);
    const bucket = buildingBuckets.get(key) ?? [];
    bucket.push(listing);
    buildingBuckets.set(key, bucket);
  }
  for (const [key, bucket] of buildingBuckets) {
    const members = new Set<ListingWithComplex>();
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        const bothFloorKnown = a.floor > 0 && b.floor > 0;
        if (bothFloorKnown) continue;
        if (!areasMatch(a, b)) continue;
        members.add(a);
        members.add(b);
      }
    }
    if (members.size >= 2) {
      groups.push(toGroup(`floor-unknown:${key}`, "floor-unknown", [...members]));
    }
  }

  const severityOrder: Record<DuplicateSuspectSeverity, number> = {
    strong: 0,
    weak: 1,
    "floor-unknown": 2,
  };
  groups.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { groups, excludedMissingBuildingCount };
}
