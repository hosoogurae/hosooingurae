import { describe, expect, it } from "vitest";
import { parseFloorPlanFileName } from "../floorPlanFileName";

describe("parseFloorPlanFileName", () => {
  it("숫자만 있으면 공급면적만 읽고 타입명은 비워둔다(숫자를 타입명으로 쓰지 않음)", () => {
    expect(parseFloorPlanFileName("131.65.jpg")).toEqual({
      typeName: null,
      supplyArea: 131.65,
    });
  });

  it("_를 소수점으로 봐서 정수 두 개를 하나의 숫자로 합친다", () => {
    expect(parseFloorPlanFileName("131_65.jpg")).toEqual({
      typeName: null,
      supplyArea: 131.65,
    });
  });

  it("타입명_공급면적 형태를 분리한다", () => {
    expect(parseFloorPlanFileName("109A_131.65.png")).toEqual({
      typeName: "109A",
      supplyArea: 131.65,
    });
  });

  it("숫자가 없으면 타입명만 읽고 면적은 비워둔다", () => {
    expect(parseFloorPlanFileName("84A.jpg")).toEqual({
      typeName: "84A",
      supplyArea: null,
    });
  });

  it("숫자 후보가 여럿이면(이미 소수인 두 값) 추측하지 않고 비워둔다", () => {
    expect(parseFloorPlanFileName("131.65_84.5.jpg")).toEqual({
      typeName: null,
      supplyArea: null,
    });
  });

  it("문자 섞인 세그먼트가 둘 이상이면 타입명도 비워둔다", () => {
    expect(parseFloorPlanFileName("84A_84B.jpg")).toEqual({
      typeName: null,
      supplyArea: null,
    });
  });

  it("타입명 + _로 나뉜 정수 두 개(소수점 표현)를 함께 읽는다", () => {
    expect(parseFloorPlanFileName("109A_131_65.jpg")).toEqual({
      typeName: "109A",
      supplyArea: 131.65,
    });
  });

  it("확장자가 없어도 동작한다", () => {
    expect(parseFloorPlanFileName("84A")).toEqual({
      typeName: "84A",
      supplyArea: null,
    });
  });
});
