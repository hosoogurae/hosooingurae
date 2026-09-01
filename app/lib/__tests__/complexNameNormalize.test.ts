import { describe, expect, it } from "vitest";
import { normalizeComplexName } from "../complexNameNormalize";

describe("normalizeComplexName", () => {
  it("공백 차이를 무시한다", () => {
    expect(normalizeComplexName("구래동 반도5차 상가")).toBe(
      normalizeComplexName("구래동반도5차상가"),
    );
  });

  it("괄호·특수문자 차이를 무시한다", () => {
    expect(normalizeComplexName("메트로타워예미지(주상복합)")).toBe(
      normalizeComplexName("메트로타워예미지 주상복합"),
    );
  });

  it("대소문자 차이를 무시한다(영문 혼용 단지명 대비)", () => {
    expect(normalizeComplexName("Hosoo Tower")).toBe(
      normalizeComplexName("hosoo tower"),
    );
  });

  it("서로 다른 단지명은 다른 값을 반환한다", () => {
    expect(normalizeComplexName("한강신도시푸르지오3차")).not.toBe(
      normalizeComplexName("한강신도시푸르지오5차"),
    );
  });
});
