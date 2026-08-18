import { describe, expect, it } from "vitest";
import type { Listing } from "../../data/listings";
import type { MolitAptTradeItem } from "../molit";
import {
  findSuspectedMatchesForComplex,
  isEligibleForSuspectedMatchCheck,
  isSuspectedMatchActive,
} from "../suspectedTransactionMatch";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    complexId: "complex-1",
    propertyType: "아파트",
    status: "published",
    dealStatus: "advertising",
    transactionType: "매매",
    price: 42000,
    priceLabel: "4억 2,000만원",
    building: "101동",
    floor: 10,
    totalFloors: 20,
    supplyArea: 109,
    exclusiveArea: 84.8,
    roomCount: 3,
    bathroomCount: 2,
    direction: "남향",
    moveInDate: "즉시입주",
    hasLoan: false,
    loanAmount: null,
    shortDescription: "",
    features: [],
    isFeatured: false,
    ...overrides,
  };
}

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

describe("isEligibleForSuspectedMatchCheck", () => {
  it("매매 + 광고중/계약진행 매물만 대상이다", () => {
    expect(isEligibleForSuspectedMatchCheck(makeListing())).toBe(true);
    expect(
      isEligibleForSuspectedMatchCheck(makeListing({ dealStatus: "negotiating" })),
    ).toBe(true);
  });

  it("전세·월세는 대상이 아니다(국토부 API 자체가 매매만 다룸)", () => {
    expect(
      isEligibleForSuspectedMatchCheck(makeListing({ transactionType: "전세" })),
    ).toBe(false);
  });

  it("이미 계약완료·보류인 매물은 다시 검사하지 않는다", () => {
    expect(
      isEligibleForSuspectedMatchCheck(makeListing({ dealStatus: "completed" })),
    ).toBe(false);
    expect(
      isEligibleForSuspectedMatchCheck(makeListing({ dealStatus: "hold" })),
    ).toBe(false);
  });
});

describe("findSuspectedMatchesForComplex", () => {
  it("층까지 일치하면 high 신뢰도다", () => {
    const listing = makeListing({ floor: 10, exclusiveArea: 84.8 });
    const trade = makeTrade({ floor: 10, excluUseAr: 84.8 });
    const [match] = findSuspectedMatchesForComplex([listing], [trade]);
    expect(match.confidence).toBe("high");
    expect(match.listingId).toBe(listing.id);
  });

  it("전용면적만(±0.5㎡ 이내) 일치하고 층이 다르면 low 신뢰도다", () => {
    const listing = makeListing({ floor: 10, exclusiveArea: 84.8 });
    const trade = makeTrade({ floor: 15, excluUseAr: 85.1 });
    const [match] = findSuspectedMatchesForComplex([listing], [trade]);
    expect(match.confidence).toBe("low");
  });

  it("전용면적 오차가 0.5㎡를 넘으면 매칭하지 않는다", () => {
    const listing = makeListing({ exclusiveArea: 84.8 });
    const trade = makeTrade({ excluUseAr: 85.4 });
    const matches = findSuspectedMatchesForComplex([listing], [trade]);
    expect(matches).toHaveLength(0);
  });

  it("매칭되는 거래가 없으면 결과에서 빠진다(확정 아닌 의심이라 애매하면 표시 안 함)", () => {
    const listing = makeListing({ exclusiveArea: 59.9 });
    const trade = makeTrade({ excluUseAr: 84.8 });
    expect(findSuspectedMatchesForComplex([listing], [trade])).toHaveLength(0);
  });

  it("여러 거래가 매칭되면 가장 최근 날짜를 고른다", () => {
    const listing = makeListing({ floor: 10, exclusiveArea: 84.8 });
    const older = makeTrade({ floor: 10, excluUseAr: 84.8, dealDate: "2026-01-01", dealAmount: 40000 });
    const newer = makeTrade({ floor: 10, excluUseAr: 84.8, dealDate: "2026-06-01", dealAmount: 44000 });
    const [match] = findSuspectedMatchesForComplex([listing], [older, newer]);
    expect(match.dealDate).toBe("2026-06-01");
    expect(match.dealAmount).toBe(44000);
  });

  it("층 일치 거래가 있으면 면적만 일치하는 거래보다 우선한다", () => {
    const listing = makeListing({ floor: 10, exclusiveArea: 84.8 });
    const areaOnly = makeTrade({ floor: 15, excluUseAr: 84.8, dealDate: "2026-06-01" });
    const floorMatch = makeTrade({ floor: 10, excluUseAr: 84.8, dealDate: "2026-01-01" });
    const [match] = findSuspectedMatchesForComplex([listing], [areaOnly, floorMatch]);
    expect(match.confidence).toBe("high");
    expect(match.dealDate).toBe("2026-01-01");
  });
});

describe("isSuspectedMatchActive", () => {
  const match = {
    listingId: "listing-1",
    confidence: "high" as const,
    dealDate: "2026-06-15",
    dealAmount: 43000,
    floor: 10,
    exclusiveArea: 84.8,
  };

  it("확인한 적 없으면(acknowledgedAt 없음) 항상 활성 상태다", () => {
    expect(isSuspectedMatchActive(match, undefined)).toBe(true);
  });

  it("확인 시각 이후 날짜의 거래면 다시 활성화된다", () => {
    expect(isSuspectedMatchActive(match, "2026-06-01T00:00:00.000Z")).toBe(true);
  });

  it("확인 시각보다 이전(또는 같은) 날짜의 거래면 비활성 상태다", () => {
    expect(isSuspectedMatchActive(match, "2026-07-01T00:00:00.000Z")).toBe(false);
  });
});
