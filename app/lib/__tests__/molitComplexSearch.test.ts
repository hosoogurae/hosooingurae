import { describe, expect, it } from "vitest";
import { summarizeMolitComplexes, type MolitAptTradeItem, type MolitComplexSearchResult } from "../molit";
import { findLawdCodeFromAddress, findUniqueMolitComplexMatch, normalizeMolitComplexName } from "../molitComplexMatch";

function trade(aptSeq: string, aptNm: string, overrides: Partial<MolitAptTradeItem> = {}): MolitAptTradeItem {
  return { aptSeq, aptNm, jibun: "", umdNm: "", buildYear: 0, aptDong: "", floor: 1,
    excluUseAr: 84, dealAmount: 50000, dealDate: "2026-01-01", cdealType: "", ...overrides };
}

describe("summarizeMolitComplexes", () => {
  it("aptSeq 기준으로 중복 제거하고 구분 정보와 거래 건수를 제공한다", () => {
    expect(summarizeMolitComplexes([
      trade("41570-1", "가단지", { umdNm: "구래동", jibun: "1-1", buildYear: 2013 }),
      trade("41570-1", "가단지", { umdNm: "구래동", jibun: "1-1", buildYear: 2013 }),
      trade("41570-2", "나단지", { umdNm: "장기동", jibun: "2", buildYear: 2014 }),
    ])).toEqual([
      { aptSeq: "41570-1", aptNm: "가단지", umdNm: "구래동", jibun: "1-1", buildYear: 2013, tradeCount: 2 },
      { aptSeq: "41570-2", aptNm: "나단지", umdNm: "장기동", jibun: "2", buildYear: 2014, tradeCount: 1 },
    ]);
  });
});

const EPYEONHAN: MolitComplexSearchResult[] = [
  { aptSeq: "41570-744", aptNm: "호수마을e편한세상아파트", umdNm: "구래동", jibun: "6874-17", buildYear: 2013, tradeCount: 5 },
  { aptSeq: "41570-763", aptNm: "호수마을이편한세상", umdNm: "구래동", jibun: "6874-6", buildYear: 2014, tradeCount: 4 },
];

describe("MOLIT 단지 자동 매칭", () => {
  it("김포시 주소에서 lawdCode를 찾는다", () => {
    expect(findLawdCodeFromAddress("경기도 김포시 김포한강9로 12")).toBe("41570");
  });

  it("e편한·이편한·E편한을 같은 이름으로 취급한다", () => {
    expect(normalizeMolitComplexName("호수마을e편한세상")).toBe(normalizeMolitComplexName("호수마을이편한세상"));
    expect(normalizeMolitComplexName("호수마을E편한세상")).toBe(normalizeMolitComplexName("호수마을이편한세상"));
  });

  it("2단지는 지번 6874-17과 2013년을 함께 확인해 41570-744를 선택한다", () => {
    expect(findUniqueMolitComplexMatch("호수마을e편한세상2단지", EPYEONHAN,
      { address: "경기도 김포시 구래동 6874-17", approvalDate: "2013-02-26" })?.aptSeq).toBe("41570-744");
  });

  it("3단지는 지번 6874-6과 2014년으로 구분한다", () => {
    expect(findUniqueMolitComplexMatch("호수마을E편한세상3단지", EPYEONHAN,
      { address: "경기도 김포시 구래동 6874-6", approvalDate: "2014-10-01" })?.aptSeq).toBe("41570-763");
  });

  it("단지명이 같아도 지번과 건축연도가 없거나 다르면 자동 확정하지 않는다", () => {
    expect(findUniqueMolitComplexMatch("호수마을이편한세상2단지", EPYEONHAN,
      { address: "", approvalDate: "" })).toBeUndefined();
    expect(findUniqueMolitComplexMatch("호수마을이편한세상2단지", EPYEONHAN,
      { address: "경기도 김포시 구래동 6874-6", approvalDate: "2013-02-26" })).toBeUndefined();
  });

  it("차수는 제거하지 않는다", () => {
    expect(normalizeMolitComplexName("반도유보라 3차")).not.toBe(normalizeMolitComplexName("반도유보라 4차"));
  });
});
