import { describe, expect, it } from "vitest";
import type { FloorPlanImage } from "../../data/floorPlans";
import { buildFloorPlanCleanupRow } from "../floorPlanCleanup";

function makeListing(overrides: Partial<Parameters<typeof buildFloorPlanCleanupRow>[0]> = {}) {
  return {
    id: "listing-1",
    priceLabel: "4억 2,000만원",
    building: "101동",
    floor: 5,
    complexId: "complex-1",
    exclusiveArea: 84.64,
    supplyArea: 108.6,
    ...overrides,
  };
}

function makeImage(overrides: Partial<FloorPlanImage> = {}): FloorPlanImage {
  return {
    id: "image-1",
    complexId: "complex-1",
    unitType: "108B",
    exclusiveArea: 84.64,
    supplyArea: 108.6,
    url: "https://example.com/a.jpg",
    sortOrder: 0,
    ...overrides,
  };
}

describe("buildFloorPlanCleanupRow", () => {
  it("매물 면적을 모르면(0) listing-area-unknown", () => {
    const row = buildFloorPlanCleanupRow(
      makeListing({ exclusiveArea: 0 }),
      "테스트단지",
      [makeImage()],
    );
    expect(row.reason).toBe("listing-area-unknown");
    expect(row.suggestedUnitType).toBeNull();
  });

  it("단지에 평면도가 하나도 없으면 no-floor-plans", () => {
    const row = buildFloorPlanCleanupRow(makeListing(), "테스트단지", []);
    expect(row.reason).toBe("no-floor-plans");
  });

  it("평면도는 있지만 전부 면적이 없으면 floor-plans-missing-area", () => {
    const row = buildFloorPlanCleanupRow(makeListing(), "테스트단지", [
      makeImage({ exclusiveArea: undefined, supplyArea: undefined }),
    ]);
    expect(row.reason).toBe("floor-plans-missing-area");
  });

  it("±0.05㎡ 이내로 전용·공급이 둘 다 일치하는 후보가 정확히 1개면 자동 제안한다", () => {
    const row = buildFloorPlanCleanupRow(
      makeListing({ exclusiveArea: 84.64, supplyArea: 108.6 }),
      "테스트단지",
      [
        makeImage({ unitType: "108B", exclusiveArea: 84.64, supplyArea: 108.6 }),
        makeImage({ unitType: "110D", exclusiveArea: 84.65, supplyArea: 110.88 }),
      ],
    );
    expect(row.reason).toBeNull();
    expect(row.suggestedUnitType).toBe("108B");
    expect(row.suggestionReasonLabel).toBe("전용 84.64 · 공급 108.6 일치");
  });

  it("허용오차(±0.05㎡)를 벗어나면 후보에서 빠진다(import-naver의 findMatchingUnitTypes와 같은 기준)", () => {
    const row = buildFloorPlanCleanupRow(
      makeListing({ exclusiveArea: 84.64, supplyArea: 108.6 }),
      "테스트단지",
      [makeImage({ unitType: "108B", exclusiveArea: 84.7, supplyArea: 108.6 })], // 전용 0.06 차이 — 벗어남
    );
    expect(row.reason).toBe("no-area-match");
  });

  it("전용·공급 중 하나만 맞고 하나는 다르면 후보가 아니다", () => {
    const row = buildFloorPlanCleanupRow(
      makeListing({ exclusiveArea: 84.64, supplyArea: 108.6 }),
      "테스트단지",
      [makeImage({ unitType: "108B", exclusiveArea: 84.64, supplyArea: 111.0 })],
    );
    expect(row.reason).toBe("no-area-match");
  });

  it("후보가 2개 이상이면 ambiguous — 자동 선택하지 않는다", () => {
    const row = buildFloorPlanCleanupRow(
      makeListing({ exclusiveArea: 84.64, supplyArea: 108.6 }),
      "테스트단지",
      [
        makeImage({ unitType: "108B", exclusiveArea: 84.64, supplyArea: 108.6 }),
        makeImage({ unitType: "108B-Rev", exclusiveArea: 84.65, supplyArea: 108.62 }),
      ],
    );
    expect(row.reason).toBe("ambiguous");
    expect(row.suggestedUnitType).toBeNull();
    expect(row.ambiguousCandidateCount).toBe(2);
  });

  it("드롭다운 옵션은 단지의 모든 타입을 중복 없이 담는다(매칭 여부와 무관)", () => {
    const row = buildFloorPlanCleanupRow(makeListing(), "테스트단지", [
      makeImage({ unitType: "108B" }),
      makeImage({ id: "image-2", unitType: "108B" }), // 같은 타입 사진 2장 — 중복 제거돼야 함
      makeImage({ id: "image-3", unitType: "110D", exclusiveArea: 84.65, supplyArea: 110.88 }),
    ]);
    expect(row.dropdownOptions.map((o) => o.unitType).sort()).toEqual(["108B", "110D"]);
  });
});
