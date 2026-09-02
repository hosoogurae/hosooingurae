import { describe, expect, it } from "vitest";
import { summarizeMolitComplexes, type MolitAptTradeItem } from "../molit";
import {
  findLawdCodeFromAddress,
  findUniqueMolitComplexMatch,
  normalizeMolitComplexName,
} from "../molitComplexMatch";

function trade(aptSeq: string, aptNm: string): MolitAptTradeItem {
  return {
    aptSeq,
    aptNm,
    jibun: "",
    umdNm: "",
    floor: 1,
    excluUseAr: 84,
    dealAmount: 50000,
    dealDate: "2026-01-01",
    cdealType: "",
  };
}

describe("summarizeMolitComplexes", () => {
  it("aptSeq 기준으로 중복 제거하고 거래 건수를 센다", () => {
    expect(summarizeMolitComplexes([
      trade("41570-1", "가단지"),
      trade("41570-1", "가단지"),
      trade("41570-2", "나단지"),
    ])).toEqual([
      { aptSeq: "41570-1", aptNm: "가단지", tradeCount: 2 },
      { aptSeq: "41570-2", aptNm: "나단지", tradeCount: 1 },
    ]);
  });
});

describe("MOLIT 단지 자동 매칭", () => {
  it("김포시 주소에서 lawdCode를 찾는다", () => {
    expect(findLawdCodeFromAddress("경기도 김포시 김포한강9로 12")).toBe("41570");
  });

  it("공백과 아파트 표기만 무시하고 정확히 하나인 5차를 선택한다", () => {
    const complexes = [
      { aptSeq: "41570-900", aptNm: "한강신도시 반도유보라 3차아파트", tradeCount: 2 },
      { aptSeq: "41570-957", aptNm: "한강신도시반도유보라5차아파트", tradeCount: 3 },
    ];
    expect(findUniqueMolitComplexMatch("한강신도시반도유보라5차", complexes)?.aptSeq).toBe("41570-957");
    expect(normalizeMolitComplexName("반도유보라 3차")).not.toBe(
      normalizeMolitComplexName("반도유보라 4차"),
    );
  });

  it("정확 일치가 중복되면 자동 선택하지 않는다", () => {
    expect(findUniqueMolitComplexMatch("가단지", [
      { aptSeq: "1", aptNm: "가단지", tradeCount: 1 },
      { aptSeq: "2", aptNm: "가단지아파트", tradeCount: 1 },
    ])).toBeUndefined();
  });
});
