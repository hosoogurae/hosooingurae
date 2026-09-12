import { describe, expect, it } from "vitest";
import { findFloorPlanForUnitType } from "../floorPlans";
import type { FloorPlanImage } from "../../data/floorPlans";

const PLAN_A: FloorPlanImage = {
  id: "plan-a",
  complexId: "complex-1",
  unitType: "84A",
  url: "https://example.com/84a.jpg",
  sortOrder: 0,
};

const PLAN_B: FloorPlanImage = {
  id: "plan-b",
  complexId: "complex-1",
  unitType: "108B",
  url: "https://example.com/108b.jpg",
  sortOrder: 1,
};

describe("findFloorPlanForUnitType", () => {
  it("unitType이 일치하는 평면도가 있으면 그것을 반환한다", () => {
    expect(findFloorPlanForUnitType([PLAN_A, PLAN_B], "108B")).toBe(PLAN_B);
  });

  it("일치하는 평면도가 없으면 undefined를 반환한다", () => {
    expect(findFloorPlanForUnitType([PLAN_A, PLAN_B], "59A")).toBeUndefined();
  });

  it("unitType 자체가 없으면(빈 문자열/undefined) 목록과 무관하게 undefined를 반환한다", () => {
    expect(findFloorPlanForUnitType([PLAN_A, PLAN_B], undefined)).toBeUndefined();
    expect(findFloorPlanForUnitType([PLAN_A, PLAN_B], "")).toBeUndefined();
  });

  it("평면도 목록 자체가 없어도(단지에 평면도 미등록) 안전하게 undefined를 반환한다", () => {
    expect(findFloorPlanForUnitType(undefined, "84A")).toBeUndefined();
  });
});
