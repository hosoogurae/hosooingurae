import { describe, expect, it } from "vitest";
import { sortUnitTypesByAreaSimilarity } from "../floorPlanAreaSort";

const CANDIDATES = [
  { unitType: "109A", exclusiveArea: 84.87, supplyArea: 109.04 },
  { unitType: "108B", exclusiveArea: 84.64, supplyArea: 108.67 },
  { unitType: "111I", exclusiveArea: 84.85, supplyArea: 111.44 },
];

describe("sortUnitTypesByAreaSimilarity", () => {
  it("전용면적이 가장 가까운 후보를 맨 위로 올린다", () => {
    const sorted = sortUnitTypesByAreaSimilarity(CANDIDATES, 84.85, undefined);
    expect(sorted.map((c) => c.unitType)).toEqual(["111I", "109A", "108B"]);
  });

  it("공급면적만 있으면 그것으로 비교한다", () => {
    const sorted = sortUnitTypesByAreaSimilarity(CANDIDATES, undefined, 108.7);
    expect(sorted[0].unitType).toBe("108B");
  });

  it("입력된 면적이 전혀 없으면 원래 순서를 유지하지 않고 이름 가나다순으로 정렬한다", () => {
    const sorted = sortUnitTypesByAreaSimilarity(CANDIDATES, undefined, undefined);
    expect(sorted.map((c) => c.unitType)).toEqual(["108B", "109A", "111I"]);
  });

  it("면적 정보가 없는 후보는 목록에서 빠지지 않고 맨 뒤로 밀린다", () => {
    const withMissingArea = [
      ...CANDIDATES,
      { unitType: "999Z" }, // exclusiveArea/supplyArea 둘 다 없음
    ];
    const sorted = sortUnitTypesByAreaSimilarity(withMissingArea, 84.85, undefined);
    expect(sorted[sorted.length - 1].unitType).toBe("999Z");
    expect(sorted).toHaveLength(4);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const original = [...CANDIDATES];
    sortUnitTypesByAreaSimilarity(CANDIDATES, 84.85, undefined);
    expect(CANDIDATES).toEqual(original);
  });
});
