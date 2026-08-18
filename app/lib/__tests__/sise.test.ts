import { describe, expect, it } from "vitest";
import type { MolitAptTradeItem } from "../molit";
import { filterValidDongTrades, summarizeDongTrades } from "../sise";

function makeTrade(overrides: Partial<MolitAptTradeItem> = {}): MolitAptTradeItem {
  return {
    aptNm: "테스트단지",
    aptSeq: "41570-1000",
    jibun: "1-1",
    umdNm: "구래동",
    floor: 10,
    excluUseAr: 84.8,
    dealAmount: 43000,
    dealDate: "2026-06-01",
    cdealType: "",
    ...overrides,
  };
}

describe("filterValidDongTrades", () => {
  it("해제(취소) 신고된 거래를 제외한다", () => {
    const trades = [makeTrade({ cdealType: "" }), makeTrade({ cdealType: "O" })];
    const result = filterValidDongTrades(trades, "구래동");
    expect(result).toHaveLength(1);
    expect(result[0].cdealType).toBe("");
  });

  it("지정한 법정동이 아닌 거래를 제외한다", () => {
    const trades = [makeTrade({ umdNm: "구래동" }), makeTrade({ umdNm: "장기동" })];
    const result = filterValidDongTrades(trades, "구래동");
    expect(result).toHaveLength(1);
    expect(result[0].umdNm).toBe("구래동");
  });
});

describe("summarizeDongTrades", () => {
  it("거래가 없으면 빈 요약을 반환한다", () => {
    const summary = summarizeDongTrades([]);
    expect(summary.tradeCount).toBe(0);
    expect(summary.averagePrice).toBeNull();
    expect(summary.highestTrade).toBeNull();
    expect(summary.complexAreaSummaries).toEqual([]);
  });

  it("전체 거래건수/평균가/최고가 거래를 계산한다", () => {
    const trades = [
      makeTrade({ dealAmount: 40000, dealDate: "2026-05-01" }),
      makeTrade({ dealAmount: 44000, dealDate: "2026-06-01" }),
      makeTrade({ dealAmount: 42000, dealDate: "2026-04-01" }),
    ];
    const summary = summarizeDongTrades(trades);
    expect(summary.tradeCount).toBe(3);
    expect(summary.averagePrice).toBe(42000);
    expect(summary.highestTrade?.dealAmount).toBe(44000);
  });

  it("같은 단지라도 전용면적이 크게 다르면(84㎡ vs 59㎡) 별도 행으로 나눈다", () => {
    const trades = [
      makeTrade({ aptSeq: "A", excluUseAr: 84.86 }),
      makeTrade({ aptSeq: "A", excluUseAr: 84.93 }),
      makeTrade({ aptSeq: "A", excluUseAr: 59.9 }),
    ];
    const summary = summarizeDongTrades(trades);
    expect(summary.complexAreaSummaries).toHaveLength(2);
    const areas = summary.complexAreaSummaries.map((s) => s.representativeArea).sort((a, b) => a - b);
    expect(areas[0]).toBeCloseTo(59.9);
    expect(areas[1]).toBeCloseTo(84.9, 1);
  });

  it("전용면적이 ±1㎡ 이내로 미세하게만 다르면 같은 행으로 묶는다", () => {
    const trades = [
      makeTrade({ aptSeq: "A", excluUseAr: 84.86 }),
      makeTrade({ aptSeq: "A", excluUseAr: 84.6 }),
    ];
    const summary = summarizeDongTrades(trades);
    expect(summary.complexAreaSummaries).toHaveLength(1);
    expect(summary.complexAreaSummaries[0].tradeCount).toBe(2);
  });

  it("다른 단지(aptSeq)는 서로 섞이지 않는다", () => {
    const trades = [
      makeTrade({ aptSeq: "A", aptNm: "A단지", excluUseAr: 84.8 }),
      makeTrade({ aptSeq: "B", aptNm: "B단지", excluUseAr: 84.8 }),
    ];
    const summary = summarizeDongTrades(trades);
    expect(summary.complexAreaSummaries).toHaveLength(2);
  });

  it("단지별 평균가/최고가/최저가/최근거래일을 그룹 기준으로 계산한다", () => {
    const trades = [
      makeTrade({ dealAmount: 40000, dealDate: "2026-01-01", excluUseAr: 84.8 }),
      makeTrade({ dealAmount: 44000, dealDate: "2026-06-01", excluUseAr: 84.9 }),
    ];
    const summary = summarizeDongTrades(trades);
    const group = summary.complexAreaSummaries[0];
    expect(group.tradeCount).toBe(2);
    expect(group.averagePrice).toBe(42000);
    expect(group.highestPrice).toBe(44000);
    expect(group.lowestPrice).toBe(40000);
    expect(group.latestDealDate).toBe("2026-06-01");
  });

  it("결과는 거래건수 많은 순으로 정렬된다", () => {
    const trades = [
      makeTrade({ aptSeq: "A", aptNm: "A단지" }),
      makeTrade({ aptSeq: "B", aptNm: "B단지" }),
      makeTrade({ aptSeq: "B", aptNm: "B단지" }),
      makeTrade({ aptSeq: "B", aptNm: "B단지" }),
    ];
    const summary = summarizeDongTrades(trades);
    expect(summary.complexAreaSummaries[0].aptNm).toBe("B단지");
    expect(summary.complexAreaSummaries[0].tradeCount).toBe(3);
  });
});
