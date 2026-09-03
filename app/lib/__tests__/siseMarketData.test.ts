import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MolitAptTradeItem } from "../molit";

const BASE_TRADE: MolitAptTradeItem = {
  aptNm: "테스트단지",
  aptSeq: "41570-1",
  jibun: "1",
  umdNm: "구래동",
  buildYear: 2015,
  aptDong: "101",
  floor: 5,
  excluUseAr: 84.9,
  dealAmount: 50000,
  dealDate: "2026-08-15",
  cdealType: "",
};

let mockTrades: MolitAptTradeItem[] = [];
let calledWith: { lawdCode?: string; months?: number } = {};

vi.mock("../molit", async () => {
  const actual = await vi.importActual<typeof import("../molit")>("../molit");
  return {
    ...actual,
    fetchRecentAptTrades: (lawdCode: string, months?: number) => {
      calledWith = { lawdCode, months };
      return Promise.resolve(mockTrades);
    },
  };
});

describe("getGuraeApartmentMarketData", () => {
  beforeEach(() => {
    mockTrades = [];
    calledWith = {};
  });

  it("김포 지역코드(41570)로 요청하고, 구래동 외 다른 동/해제 거래는 걸러낸다", async () => {
    mockTrades = [
      { ...BASE_TRADE },
      { ...BASE_TRADE, umdNm: "장기동" }, // 다른 동 — 제외돼야 함
      { ...BASE_TRADE, cdealType: "O" }, // 해제(취소) 신고 — 제외돼야 함
    ];

    const { getGuraeApartmentMarketData } = await import("../siseMarketData");
    const result = await getGuraeApartmentMarketData(18);

    expect(calledWith.lawdCode).toBe("41570");
    expect(calledWith.months).toBe(18);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].umdNm).toBe("구래동");
  });

  it("조회 대상 연월 목록과 조회 시각을 함께 돌려준다", async () => {
    mockTrades = [];

    const { getGuraeApartmentMarketData } = await import("../siseMarketData");
    const before = Date.now();
    const result = await getGuraeApartmentMarketData(3);
    const after = Date.now();

    expect(result.coveredYearMonths).toHaveLength(3);
    expect(result.coveredYearMonths[0]).toMatch(/^\d{6}$/);
    const queriedAtMs = new Date(result.queriedAt).getTime();
    expect(queriedAtMs).toBeGreaterThanOrEqual(before);
    expect(queriedAtMs).toBeLessThanOrEqual(after);
  });
});
