import { describe, expect, it } from "vitest";
import { parseComplexFieldsInput } from "../complexValidation";
import { toDbPatch } from "../complexes";

describe("단지 관리 필드 저장 경로", () => {
  it("폼 payload를 검증하고 Supabase update 컬럼으로 모두 매핑한다", () => {
    const payload = {
      managementOfficePhone: "031-983-0052",
      managementFeeWon: 297057,
      managementFeeRaw: "29만 7,057원",
      managementFeeAsOf: "2026-06",
      subway: "구래역",
      subwayDistance: "330m",
      subwayWalkMinutes: 7,
    };
    const { input, errors } = parseComplexFieldsInput(payload);
    expect(errors).toBeUndefined();
    expect(toDbPatch(input!)).toMatchObject({
      management_office_phone: "031-983-0052",
      management_fee_won: 297057,
      management_fee_raw: "29만 7,057원",
      management_fee_as_of: "2026-06",
      subway: "구래역",
      subway_distance: "330m",
      subway_walk_minutes: 7,
    });
  });
});
