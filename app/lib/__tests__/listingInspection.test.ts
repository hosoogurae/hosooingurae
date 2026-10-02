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

describe("matchesInspectionCategory — no-transaction-match", () => {
  it("전용면적이 있으면 걸리지 않는다", () => {
    expect(matchesInspectionCategory(BASE, "no-transaction-match", {})).toBe(false);
  });

  it("전용면적이 0이면 걸린다(국토부 실거래와 비교할 기준이 없음)", () => {
    const listing = { ...BASE, exclusiveArea: 0 };
    expect(matchesInspectionCategory(listing, "no-transaction-match", {})).toBe(true);
  });

  it("층수·방 수 등 다른 필드가 0이어도 전용면적만 있으면 걸리지 않는다", () => {
    const listing = { ...BASE, floor: 0, totalFloors: 0, roomCount: 0 };
    expect(matchesInspectionCategory(listing, "no-transaction-match", {})).toBe(false);
  });
});

describe("matchesInspectionCategory — auto-held", () => {
  it("hold이고 autoHeldAt이 있으면(자동 보류) 걸린다", () => {
    const listing = { ...BASE, dealStatus: "hold" as const, autoHeldAt: "2026-09-01T00:00:00.000Z" };
    expect(matchesInspectionCategory(listing, "auto-held", {})).toBe(true);
  });

  it("hold이지만 autoHeldAt이 없으면(사람이 직접 보류) 걸리지 않는다", () => {
    const listing = { ...BASE, dealStatus: "hold" as const };
    expect(matchesInspectionCategory(listing, "auto-held", {})).toBe(false);
  });

  it("hold가 아니면 autoHeldAt이 있어도 걸리지 않는다", () => {
    const listing = { ...BASE, dealStatus: "advertising" as const, autoHeldAt: "2026-09-01T00:00:00.000Z" };
    expect(matchesInspectionCategory(listing, "auto-held", {})).toBe(false);
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
