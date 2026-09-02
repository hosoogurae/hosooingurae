import { describe, expect, it } from "vitest";
import type { Listing } from "../../data/listings";
import type { MolitAptTradeItem } from "../molit";
import { findSuspectedMatchesForComplex, isEligibleForSuspectedMatchCheck,
  SUSPECTED_AREA_TOLERANCE_SQM, SUSPECTED_PRICE_TOLERANCE_RATIO } from "../suspectedTransactionMatch";

function listing(overrides: Partial<Listing> = {}): Listing {
  return { id: "listing-1", complexId: "complex-1", propertyType: "아파트", status: "published",
    dealStatus: "advertising", transactionType: "매매", price: 42000, priceLabel: "4억 2,000만원",
    building: "101동", floor: 10, totalFloors: 20, supplyArea: 109, exclusiveArea: 84.8,
    roomCount: 3, bathroomCount: 2, direction: "남향", moveInDate: "즉시입주", hasLoan: false,
    loanAmount: null, shortDescription: "", features: [], isFeatured: false, ...overrides };
}
function trade(overrides: Partial<MolitAptTradeItem> = {}): MolitAptTradeItem {
  return { aptNm: "테스트단지", aptSeq: "41570-1000", jibun: "1-1", umdNm: "구래동",
    aptDong: "101", floor: 10, excluUseAr: 84.8, dealAmount: 43000,
    dealDate: "2026-06-01", cdealType: "", ...overrides };
}

describe("거래 의심 판정", () => {
  it("광고·협의 중인 매매만 검사한다", () => {
    expect(isEligibleForSuspectedMatchCheck(listing())).toBe(true);
    expect(isEligibleForSuspectedMatchCheck(listing({ transactionType: "전세" }))).toBe(false);
    expect(isEligibleForSuspectedMatchCheck(listing({ dealStatus: "completed" }))).toBe(false);
  });
  it("면적 ±0.5㎡, 같은 층, 가격 ±10%이면 감지하고 근거를 제공한다", () => {
    expect(SUSPECTED_AREA_TOLERANCE_SQM).toBe(0.5);
    expect(SUSPECTED_PRICE_TOLERANCE_RATIO).toBe(0.1);
    const [match] = findSuspectedMatchesForComplex([listing()], [trade()]);
    expect(match.reason).toBe("단지·거래유형·면적·층·가격이 유사하여 감지됨");
    expect(match.matchKey).toContain("listing-1|41570-1000");
  });
  it("층이 다르거나 가격 차이가 10%를 넘으면 제외한다", () => {
    expect(findSuspectedMatchesForComplex([listing()], [trade({ floor: 11 })])).toHaveLength(0);
    expect(findSuspectedMatchesForComplex([listing()], [trade({ dealAmount: 47000 })])).toHaveLength(0);
  });
  it("해제 거래를 제외한다", () => {
    expect(findSuspectedMatchesForComplex([listing()], [trade({ cdealType: "O" })])).toHaveLength(0);
  });
  it("동일 조합을 중복 집계하지 않는다", () => {
    const same = trade();
    expect(findSuspectedMatchesForComplex([listing()], [same, { ...same }])).toHaveLength(1);
  });
});
