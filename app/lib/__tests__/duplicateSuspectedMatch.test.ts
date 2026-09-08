import { describe, expect, it } from "vitest";
import type { ListingWithComplex } from "../listings";
import { findDuplicateSuspectGroups } from "../duplicateSuspectedMatch";

let nextId = 1;

function makeListing(
  overrides: Partial<ListingWithComplex> & { complexName?: string },
): ListingWithComplex {
  const id = overrides.id ?? `listing-${nextId++}`;
  return {
    id,
    complexId: overrides.complexId ?? "complex-1",
    complex: {
      id: overrides.complexId ?? "complex-1",
      name: overrides.complexName ?? "호수마을e편한세상2단지",
      address: "",
      propertyType: "아파트",
      nearbySchools: [],
      transportation: {},
      features: [],
    },
    propertyType: "아파트",
    status: overrides.status ?? "published",
    dealStatus: overrides.dealStatus ?? "advertising",
    transactionType: overrides.transactionType ?? "매매",
    price: overrides.price ?? 40000,
    priceLabel: overrides.priceLabel ?? "4억원",
    building: overrides.building ?? "302동",
    floor: overrides.floor ?? 6,
    totalFloors: overrides.totalFloors ?? 26,
    supplyArea: overrides.supplyArea ?? 108.6,
    exclusiveArea: overrides.exclusiveArea ?? 84.64,
    roomCount: overrides.roomCount ?? 3,
    bathroomCount: overrides.bathroomCount ?? 2,
    direction: overrides.direction ?? "남향",
    moveInDate: overrides.moveInDate ?? "즉시입주",
    hasLoan: false,
    loanAmount: null,
    shortDescription: overrides.shortDescription ?? "",
    features: overrides.features ?? [],
    isFeatured: false,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    lastVerifiedAt: overrides.lastVerifiedAt,
  };
}

describe("findDuplicateSuspectGroups — 강함/약함(같은 층)", () => {
  it("단지·동·층·거래유형·면적이 모두 같으면 강함", () => {
    const a = makeListing({ id: "a" });
    const b = makeListing({ id: "b" });
    const { groups } = findDuplicateSuspectGroups([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].severity).toBe("strong");
    expect(groups[0].listings.map((l) => l.id).sort()).toEqual(["a", "b"]);
  });

  it("동·층·거래유형은 같은데 면적이 다르면 약함", () => {
    const a = makeListing({ id: "a", supplyArea: 108.6, exclusiveArea: 84.64 });
    const b = makeListing({ id: "b", supplyArea: 109.61, exclusiveArea: 84.63 });
    const { groups } = findDuplicateSuspectGroups([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].severity).toBe("weak");
  });

  it("층이 다르면 애초에 그룹으로 묶이지 않는다", () => {
    const a = makeListing({ id: "a", floor: 6 });
    const b = makeListing({ id: "b", floor: 12 });
    const { groups } = findDuplicateSuspectGroups([a, b]);
    expect(groups).toHaveLength(0);
  });

  it("동이 다르면 묶이지 않는다", () => {
    const a = makeListing({ id: "a", building: "302동" });
    const b = makeListing({ id: "b", building: "305동" });
    const { groups } = findDuplicateSuspectGroups([a, b]);
    expect(groups).toHaveLength(0);
  });

  it("비공개(draft) 매물은 비교 대상에서 빠진다", () => {
    const a = makeListing({ id: "a", status: "published" });
    const b = makeListing({ id: "b", status: "draft" });
    const { groups } = findDuplicateSuspectGroups([a, b]);
    expect(groups).toHaveLength(0);
  });

  it("3건 이상이 한 그룹으로 묶인다", () => {
    const a = makeListing({ id: "a" });
    const b = makeListing({ id: "b" });
    const c = makeListing({ id: "c", supplyArea: 200, exclusiveArea: 150 }); // 면적만 다름(약함 후보)
    const { groups } = findDuplicateSuspectGroups([a, b, c]);
    expect(groups).toHaveLength(1);
    expect(groups[0].listings).toHaveLength(3);
    // a·b가 완전히 같으므로 그룹 전체는 강함으로 판정됩니다.
    expect(groups[0].severity).toBe("strong");
  });
});

describe("findDuplicateSuspectGroups — 층미상(둘 중 하나라도 층을 모름)", () => {
  it("동은 같고 층을 모르는 매물이 면적 같은 다른 매물과 있으면 층미상으로 잡는다", () => {
    const known = makeListing({ id: "known", building: "306동", floor: 15 });
    const unknown = makeListing({ id: "unknown", building: "306동", floor: 0 });
    const { groups } = findDuplicateSuspectGroups([known, unknown]);
    expect(groups).toHaveLength(1);
    expect(groups[0].severity).toBe("floor-unknown");
    expect(groups[0].floor).toBeUndefined();
    expect(groups[0].listings.map((l) => l.id).sort()).toEqual(["known", "unknown"]);
  });

  it("층을 몰라도 면적이 다르면 층미상 그룹으로도 잡지 않는다", () => {
    const known = makeListing({ id: "known", building: "306동", floor: 15 });
    const unknown = makeListing({
      id: "unknown",
      building: "306동",
      floor: 0,
      supplyArea: 200,
      exclusiveArea: 150,
    });
    const { groups } = findDuplicateSuspectGroups([known, unknown]);
    expect(groups).toHaveLength(0);
  });

  it("층을 둘 다 알고 서로 다르면 층미상 그룹에도 안 들어간다(이미 다른 집으로 확인됨)", () => {
    const a = makeListing({ id: "a", building: "306동", floor: 15 });
    const b = makeListing({ id: "b", building: "306동", floor: 16 });
    const { groups } = findDuplicateSuspectGroups([a, b]);
    expect(groups).toHaveLength(0);
  });
});

describe("findDuplicateSuspectGroups — 동 정보 자체가 없는 매물", () => {
  it("동이 없는 매물은 그룹핑을 시도하지 않고 제외 건수로만 센다", () => {
    const withBuilding = makeListing({ id: "a", building: "306동" });
    const noBuilding = makeListing({ id: "b", building: "" });
    const { groups, excludedMissingBuildingCount } = findDuplicateSuspectGroups([
      withBuilding,
      noBuilding,
    ]);
    expect(groups).toHaveLength(0);
    expect(excludedMissingBuildingCount).toBe(1);
  });
});

describe("findDuplicateSuspectGroups — 정렬(강함이 먼저)", () => {
  it("강함·약함·층미상 그룹이 섞여 있으면 강함부터 나온다", () => {
    const strongA = makeListing({ id: "strong-a", building: "301동", floor: 1 });
    const strongB = makeListing({ id: "strong-b", building: "301동", floor: 1 });
    const weakA = makeListing({
      id: "weak-a",
      building: "302동",
      floor: 2,
      supplyArea: 100,
    });
    const weakB = makeListing({
      id: "weak-b",
      building: "302동",
      floor: 2,
      supplyArea: 110,
    });
    const floorUnknownA = makeListing({ id: "fu-a", building: "303동", floor: 3 });
    const floorUnknownB = makeListing({ id: "fu-b", building: "303동", floor: 0 });

    const { groups } = findDuplicateSuspectGroups([
      weakA,
      weakB,
      floorUnknownA,
      floorUnknownB,
      strongA,
      strongB,
    ]);
    expect(groups.map((g) => g.severity)).toEqual(["strong", "weak", "floor-unknown"]);
  });
});
