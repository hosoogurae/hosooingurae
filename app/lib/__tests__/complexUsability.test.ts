import { describe, expect, it } from "vitest";
import { COMPLEX_PROPERTY_TYPES, type Complex } from "../../data/complexes";
import { computeComplexCompletion } from "../complexes";
import { parseListingPayload } from "../listingValidation";

const BASE_COMPLEX: Complex = {
  id: "complex-1",
  name: "테스트단지",
  address: "경기도 김포시",
  propertyType: "공동주택",
  approvalDate: "2020-01-01",
  totalHouseholds: 100,
  nearbySchools: [],
  transportation: {},
  features: [],
};

const BASE_LISTING = {
  id: "shop-1",
  propertyType: "상가",
  status: "draft",
  transactionType: "매매",
  price: 10000,
  priceLabel: "1억",
  building: "근린상가",
  floor: 1,
  totalFloors: 3,
  supplyArea: 30,
  exclusiveArea: 20,
  roomCount: 0,
  bathroomCount: 0,
  direction: "",
  moveInDate: "",
  maintenanceFee: "",
  shortDescription: "",
};

describe("단지 완성도", () => {
  it("선택 필드가 비어도 핵심 기본정보가 있으면 입력 완료다", () => {
    const completion = computeComplexCompletion(BASE_COMPLEX, 0);
    expect(completion.basic).toBe("complete");
    expect(completion.basicMissing).toEqual([]);
    expect(completion.ai).toBe("partial");
    expect(completion.aiMissing).toEqual(["지하철 또는 학교 정보"]);
  });

  it("누락된 핵심 기본정보 이름을 구체적으로 반환한다", () => {
    const completion = computeComplexCompletion(
      { ...BASE_COMPLEX, address: "", approvalDate: undefined },
      0,
    );
    expect(completion.basicMissing).toEqual(["주소", "사용승인일"]);
  });
});

describe("독립 상가 등록", () => {
  it("상가는 complexId 없이도 payload 검증을 통과한다", () => {
    const result = parseListingPayload(BASE_LISTING);
    expect(result.errors).toEqual([]);
    expect(result.listing?.complexId).toBe("");
  });

  it("아파트는 기존대로 complexId가 필수다", () => {
    const result = parseListingPayload({ ...BASE_LISTING, propertyType: "아파트" });
    expect(result.errors).toContain("complexId 값이 비어있습니다.");
  });

  it("신규 단지 유형에 아파트상가가 없다", () => {
    expect(COMPLEX_PROPERTY_TYPES).not.toContain("아파트상가");
  });
});
