import { describe, expect, it } from "vitest";
import type { MolitAptTradeItem } from "../molit";
import {
  MIN_SAMPLE_SIZE,
  buildComplexAreaBrackets,
  countRecentTrades,
  filterValidDongTrades,
  getPeriodRange,
  medianPrice,
  summarizeMedianPrice,
} from "../sise";

function makeTrade(overrides: Partial<MolitAptTradeItem> = {}): MolitAptTradeItem {
  return {
    aptNm: "테스트단지",
    aptSeq: "41570-1000",
    jibun: "1-1",
    umdNm: "구래동",
    buildYear: 2013,
    aptDong: "",
    floor: 10,
    excluUseAr: 84.8,
    dealAmount: 43000,
    dealDate: "2026-06-01",
    cdealType: "",
    ...overrides,
  };
}

/** "지금"을 2026-09-03으로 고정 — 기간 계산 테스트를 재현 가능하게 합니다. */
const NOW = new Date(2026, 8, 3);

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

describe("medianPrice", () => {
  it("홀수 개면 가운데 값이다", () => {
    expect(medianPrice([40000, 50000, 60000])).toBe(50000);
  });

  it("짝수 개면 가운데 두 값의 평균이다", () => {
    expect(medianPrice([40000, 50000, 60000, 70000])).toBe(55000);
  });

  it("극단값 하나에 덜 흔들린다(평균과 비교)", () => {
    const prices = [40000, 41000, 42000, 43000, 100000];
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    expect(medianPrice(prices)).toBe(42000);
    expect(medianPrice(prices)).toBeLessThan(average);
  });
});

describe("summarizeMedianPrice", () => {
  it(`표본이 ${MIN_SAMPLE_SIZE}건 미만이면 수치를 감춘다`, () => {
    const trades = Array.from({ length: MIN_SAMPLE_SIZE - 1 }, () => makeTrade());
    const result = summarizeMedianPrice(trades);
    expect(result.hidden).toBe(true);
    expect(result.count).toBe(MIN_SAMPLE_SIZE - 1);
  });

  it(`표본이 ${MIN_SAMPLE_SIZE}건 이상이면 중앙값·최저·최고를 계산한다`, () => {
    const trades = [
      makeTrade({ dealAmount: 40000 }),
      makeTrade({ dealAmount: 41000 }),
      makeTrade({ dealAmount: 42000 }),
      makeTrade({ dealAmount: 43000 }),
      makeTrade({ dealAmount: 100000 }),
    ];
    const result = summarizeMedianPrice(trades);
    if (result.hidden) throw new Error("hidden이면 안 됨");
    expect(result.count).toBe(5);
    expect(result.medianPrice).toBe(42000);
    expect(result.minPrice).toBe(40000);
    expect(result.maxPrice).toBe(100000);
  });
});

describe("getPeriodRange", () => {
  it("이번 달(진행 중일 수 있는 달)은 제외하고, 그 직전 N개월을 잡는다", () => {
    const range = getPeriodRange(NOW, 6, 1);
    expect(range.startDate).toBe("2026-03-01");
    expect(range.endDate).toBe("2026-08-31");
    expect(range.label).toBe("2026.03~2026.08");
  });

  it("offset을 늘리면 그만큼 더 과거로 밀린 같은 길이의 기간이 된다", () => {
    const range = getPeriodRange(NOW, 6, 7);
    expect(range.startDate).toBe("2025-09-01");
    expect(range.endDate).toBe("2026-02-28");
    expect(range.label).toBe("2025.09~2026.02");
  });
});

describe("buildComplexAreaBrackets", () => {
  it("전용면적이 크게 다르면(84㎡ vs 59㎡) 별도 구간으로 나눈다", () => {
    const trades = [
      makeTrade({ excluUseAr: 84.86, dealDate: "2026-08-01" }),
      makeTrade({ excluUseAr: 84.93, dealDate: "2026-08-02" }),
      makeTrade({ excluUseAr: 59.9, dealDate: "2026-08-03" }),
    ];
    const brackets = buildComplexAreaBrackets(trades, NOW);
    expect(brackets).toHaveLength(2);
  });

  it("±1㎡ 이내 차이는 같은 구간으로 묶는다", () => {
    const trades = [
      makeTrade({ excluUseAr: 84.86, dealDate: "2026-08-01" }),
      makeTrade({ excluUseAr: 84.6, dealDate: "2026-08-02" }),
    ];
    const brackets = buildComplexAreaBrackets(trades, NOW);
    expect(brackets).toHaveLength(1);
    expect(brackets[0].trades).toHaveLength(2);
  });

  it("거래건수 많은 구간이 먼저 온다", () => {
    const trades = [
      ...Array.from({ length: 3 }, () => makeTrade({ excluUseAr: 59.9 })),
      ...Array.from({ length: 1 }, () => makeTrade({ excluUseAr: 84.9 })),
    ];
    const brackets = buildComplexAreaBrackets(trades, NOW);
    expect(brackets[0].representativeArea).toBeCloseTo(59.9);
  });

  it("recent 기간 안의 거래만 표본으로 세고, 5건 미만이면 감춘다", () => {
    const trades = [
      makeTrade({ dealDate: "2026-08-01" }), // recent(03~08) 안
      makeTrade({ dealDate: "2025-01-01" }), // recent 밖(18개월 조회 범위지만 기간 밖)
    ];
    const brackets = buildComplexAreaBrackets(trades, NOW);
    expect(brackets[0].recent.hidden).toBe(true);
    expect(brackets[0].recent.count).toBe(1);
    // 거래 내역 자체(trades)는 기간과 무관하게 전체를 담고 있어야 상세화면에서 볼 수 있다.
    expect(brackets[0].trades).toHaveLength(2);
  });

  it("현재·직전 기간 둘 다 5건 이상이어야 전기 대비를 계산한다", () => {
    const enoughTrades = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeTrade({ dealDate: `2026-0${3 + (i % 6)}-01`, dealAmount: 40000 + i * 1000 }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeTrade({ dealDate: `2025-${9 + (i % 4 === 0 ? 0 : 0)}-01`, dealAmount: 38000 }),
      ),
    ];
    // 직전 기간(2025.09~2026.02)에 5건을 명시적으로 채운다.
    const previousPeriodTrades = [
      makeTrade({ dealDate: "2025-09-01", dealAmount: 38000 }),
      makeTrade({ dealDate: "2025-10-01", dealAmount: 38000 }),
      makeTrade({ dealDate: "2025-11-01", dealAmount: 38000 }),
      makeTrade({ dealDate: "2025-12-01", dealAmount: 38000 }),
      makeTrade({ dealDate: "2026-01-01", dealAmount: 38000 }),
    ];
    const brackets = buildComplexAreaBrackets(
      [...enoughTrades.slice(0, 5), ...previousPeriodTrades],
      NOW,
    );
    expect(brackets[0].comparison).not.toBeNull();
    expect(brackets[0].comparison?.previous.count).toBe(5);
    expect(brackets[0].comparison?.current.count).toBe(5);
  });

  it("한쪽 표본이라도 5건 미만이면 전기 대비를 null로 둔다(양쪽 다 있어도 값을 반쯤 만들지 않음)", () => {
    const trades = [
      ...Array.from({ length: 5 }, () => makeTrade({ dealDate: "2026-08-01" })), // current만 충분
      makeTrade({ dealDate: "2025-09-01" }), // previous는 1건뿐
    ];
    const brackets = buildComplexAreaBrackets(trades, NOW);
    expect(brackets[0].comparison).toBeNull();
  });
});

describe("countRecentTrades", () => {
  it("최근 기간 밖의 거래는 세지 않는다", () => {
    const trades = [
      makeTrade({ dealDate: "2026-08-01" }),
      makeTrade({ dealDate: "2024-01-01" }),
    ];
    expect(countRecentTrades(trades, NOW)).toBe(1);
  });
});
