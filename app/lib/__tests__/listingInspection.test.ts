import { describe, expect, it } from "vitest";
import type { Listing } from "../../data/listings";
import {
  describeMissingFieldsReason,
  matchesInspectionCategory,
} from "../listingInspection";

const BASE: Listing = {
  id: "listing-1",
  complexId: "complex-1",
  propertyType: "아파트",
  status: "published",
  dealStatus: "advertising",
  transactionType: "매매",
  price: 41000,
  priceLabel: "4억 1,000만원",
  building: "203동",
  floor: 11,
  totalFloors: 20,
  supplyArea: 109.87,
  exclusiveArea: 84.97,
  roomCount: 3,
  bathroomCount: 2,
  direction: "남동향",
  moveInDate: "즉시입주",
  maintenanceFee: "25만원",
  hasLoan: false,
  loanAmount: null,
  shortDescription: "판상형 현관창고 중문등상태굿 공원뷰굿",
  features: ["판상형", "현관창고", "공원뷰굿"],
  isFeatured: false,
};

describe("matchesInspectionCategory — missing-fields", () => {
  it("모든 값이 정상이면 걸리지 않는다", () => {
    expect(matchesInspectionCategory(BASE, "missing-fields", {})).toBe(false);
  });

  it("층수가 0이면 걸린다", () => {
    const listing = { ...BASE, floor: 0, totalFloors: 0 };
    expect(matchesInspectionCategory(listing, "missing-fields", {})).toBe(true);
  });

  it("면적이 0이면 걸린다", () => {
    const listing = { ...BASE, exclusiveArea: 0, supplyArea: 0 };
    expect(matchesInspectionCategory(listing, "missing-fields", {})).toBe(true);
  });

  it("방/욕실 수가 0이면 걸린다", () => {
    const listing = { ...BASE, roomCount: 0, bathroomCount: 0 };
    expect(matchesInspectionCategory(listing, "missing-fields", {})).toBe(true);
  });
});

describe("describeMissingFieldsReason", () => {
  it("정상 매물은 빈 문자열을 반환한다", () => {
    expect(describeMissingFieldsReason(BASE)).toBe("");
  });

  it("빠진 항목을 구체적으로 나열한다", () => {
    const listing = { ...BASE, floor: 0, totalFloors: 0, roomCount: 0 };
    const reason = describeMissingFieldsReason(listing);
    expect(reason).toContain("층수 미입력");
    expect(reason).toContain("방/욕실 수 미입력");
    expect(reason).not.toContain("면적 미입력");
  });
});
