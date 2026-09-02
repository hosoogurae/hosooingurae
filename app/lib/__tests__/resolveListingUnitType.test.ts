import { beforeEach, describe, expect, it, vi } from "vitest";
import { NO_FLOOR_PLAN_UNIT_TYPE } from "../../data/listings";

/**
 * resolveListingUnitType은 "평형 타입" API 검증의 핵심입니다. 화면 드롭다운을
 * 거치지 않고 API를 직접 호출해도(예: 예전 108B vs 100B 사례처럼) 그 단지에
 * 실제로 없는 타입명이 저장되지 않는지 확인합니다.
 */

let mockUnitTypeRows: { unit_type: string }[] = [];

vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: mockUnitTypeRows, error: null }),
      }),
    }),
  }),
  getSupabaseAdminClient: () => ({}),
}));

describe("resolveListingUnitType", () => {
  beforeEach(() => {
    mockUnitTypeRows = [];
  });

  it("이 단지에 평면도가 없으면 어떤 값이든(빈 값 포함) 그대로 허용한다", async () => {
    mockUnitTypeRows = [];
    const { resolveListingUnitType } = await import("../floorPlans");

    expect(await resolveListingUnitType("complex-1", undefined)).toEqual({
      unitType: undefined,
    });
    expect(await resolveListingUnitType("complex-1", "아무값")).toEqual({
      unitType: "아무값",
    });
  });

  it("평면도가 있는데 값이 비어있으면 거부하고, 등록된 타입명을 메시지에 알려준다", async () => {
    mockUnitTypeRows = [{ unit_type: "100B" }, { unit_type: "110A" }];
    const { resolveListingUnitType } = await import("../floorPlans");

    const result = await resolveListingUnitType("complex-1", undefined);
    expect(result.unitType).toBeUndefined();
    expect(result.error).toContain("100B");
    expect(result.error).toContain("110A");
  });

  it("등록된 타입과 정확히 일치하면 통과한다", async () => {
    mockUnitTypeRows = [{ unit_type: "100B" }, { unit_type: "110A" }];
    const { resolveListingUnitType } = await import("../floorPlans");

    const result = await resolveListingUnitType("complex-1", "100B");
    expect(result).toEqual({ unitType: "100B" });
  });

  it("등록된 타입과 다르면(예: 108B vs 100B 오타) 거부하고, 실제 등록된 타입명을 메시지에 알려준다", async () => {
    mockUnitTypeRows = [{ unit_type: "100B" }];
    const { resolveListingUnitType } = await import("../floorPlans");

    const result = await resolveListingUnitType("complex-1", "108B");
    expect(result.unitType).toBeUndefined();
    expect(result.error).toContain("등록된 평면도 타입이 아닙니다");
    // 관리자가 이미 잘못 저장된 값을 고치려 할 때, 다시 열어보지 않아도
    // 무엇으로 바꿔야 하는지 에러 메시지만 보고 알 수 있어야 합니다.
    expect(result.error).toContain("100B");
  });

  it("NO_FLOOR_PLAN_UNIT_TYPE을 보내면 '해당 없음'으로 확정하고 undefined로 저장한다", async () => {
    mockUnitTypeRows = [{ unit_type: "100B" }];
    const { resolveListingUnitType } = await import("../floorPlans");

    const result = await resolveListingUnitType("complex-1", NO_FLOOR_PLAN_UNIT_TYPE);
    expect(result).toEqual({ unitType: undefined });
  });
});
