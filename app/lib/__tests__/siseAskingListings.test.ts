import { describe, expect, it } from "vitest";
import type { Listing } from "../../data/listings";
import { buildAskingListingsForBracket } from "../siseAskingListings";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    complexId: "complex-1",
    propertyType: "아파트",
    status: "published",
    dealStatus: "advertising",
    transactionType: "매매",
    price: 50000,
    priceLabel: "5억",
    building: "101동",
    floor: 5,
    totalFloors: 20,
    supplyArea: 109,
    exclusiveArea: 84.9,
    roomCount: 3,
    bathroomCount: 2,
    direction: "남향",
    moveInDate: "즉시입주",
    maintenanceFee: "15만원",
    hasLoan: false,
    loanAmount: null,
    shortDescription: "",
    features: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    isFeatured: false,
    ...overrides,
  };
}

describe("buildAskingListingsForBracket", () => {
  it("구간(±1㎡) 안의 매매 매물을 그대로 목록으로 돌려준다(통계 아님)", () => {
    const listings = [
      makeListing({ id: "a", exclusiveArea: 84.9, transactionType: "매매" }),
      makeListing({ id: "b", exclusiveArea: 84.5, transactionType: "매매" }),
      makeListing({ id: "c", exclusiveArea: 59.9, transactionType: "매매" }), // 구간 밖
    ];
    const result = buildAskingListingsForBracket(listings, 84.9);
    expect(result.saleListings.map((l) => l.id).sort()).toEqual(["a", "b"]);
  });

  it("매매가 0건이고 전세·월세가 있으면 그 건수를 따로 알려준다", () => {
    const listings = [
      makeListing({ id: "a", exclusiveArea: 84.9, transactionType: "전세" }),
      makeListing({ id: "b", exclusiveArea: 84.9, transactionType: "전세" }),
      makeListing({ id: "c", exclusiveArea: 84.9, transactionType: "월세" }),
    ];
    const result = buildAskingListingsForBracket(listings, 84.9);
    expect(result.saleListings).toHaveLength(0);
    expect(result.jeonseCount).toBe(2);
    expect(result.wolseCount).toBe(1);
  });

  it("전용면적을 모르는 매물(0)은 어느 구간에도 넣지 않는다", () => {
    const listings = [makeListing({ exclusiveArea: 0, transactionType: "매매" })];
    const result = buildAskingListingsForBracket(listings, 84.9);
    expect(result.saleListings).toHaveLength(0);
    expect(result.jeonseCount).toBe(0);
    expect(result.wolseCount).toBe(0);
  });
});
