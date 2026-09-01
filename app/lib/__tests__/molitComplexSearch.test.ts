import { describe, expect, it } from "vitest";
import { summarizeMolitComplexes, type MolitAptTradeItem } from "../molit";

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
