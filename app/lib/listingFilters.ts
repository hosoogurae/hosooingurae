import type { PropertyType, TransactionType } from "../data/listings";

export interface FilterOption {
  value: string;
  label: string;
}

/** 홈 히어로 검색창과 /listings 필터에서 함께 쓰는 매물종류 옵션(쿼리 값 ↔ 라벨). */
export const PROPERTY_TYPE_OPTIONS: FilterOption[] = [
  { value: "", label: "전체 매물종류" },
  { value: "apartment", label: "아파트" },
  { value: "officetel", label: "오피스텔" },
  { value: "commercial", label: "상가" },
];

export const TRANSACTION_TYPE_OPTIONS: FilterOption[] = [
  { value: "", label: "전체 거래유형" },
  { value: "sale", label: "매매" },
  { value: "jeonse", label: "전세" },
  { value: "monthly", label: "월세" },
];

export const PRICE_RANGE_OPTIONS: FilterOption[] = [
  { value: "", label: "전체 가격대" },
  { value: "under-1", label: "1억 이하" },
  { value: "1-3", label: "1억~3억" },
  { value: "3-5", label: "3억~5억" },
  { value: "over-5", label: "5억 이상" },
];

const PROPERTY_TYPE_BY_QUERY: Record<string, PropertyType> = {
  apartment: "아파트",
  officetel: "오피스텔",
  commercial: "상가",
};

const TRANSACTION_TYPE_BY_QUERY: Record<string, TransactionType> = {
  sale: "매매",
  jeonse: "전세",
  monthly: "월세",
};

/** 만원 단위. "억" 표기를 실제 price 비교값으로 환산합니다. */
const PRICE_RANGE_BOUNDS: Record<string, { minPrice?: number; maxPrice?: number }> = {
  "under-1": { maxPrice: 10000 },
  "1-3": { minPrice: 10000, maxPrice: 30000 },
  "3-5": { minPrice: 30000, maxPrice: 50000 },
  "over-5": { minPrice: 50000 },
};

export interface ListingSearchFilters {
  propertyType?: PropertyType;
  transactionType?: TransactionType;
  minPrice?: number;
  maxPrice?: number;
  /** 상단 메뉴 "추천매물"에서만 붙는 조건(?featured=true). 검색창 필터와는 별개입니다. */
  featured?: boolean;
  /** Header의 "아파트" 드롭다운에서 특정 단지를 선택했을 때만 붙는 조건(?complexId=...). */
  complexId?: string;
}

/** page.tsx의 searchParams와 동일한 형태. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * URL 쿼리(예: ?propertyType=apartment&transactionType=jeonse)를 실제 필터 조건으로
 * 바꿉니다. 인식하지 못하는 값("전체" 선택 시 값이 아예 없는 경우 포함)은 조용히
 * 무시하고 해당 조건 없이 검색합니다(허위로 값을 만들지 않음).
 */
export function parseListingSearchParams(
  searchParams: RawSearchParams,
): ListingSearchFilters {
  const filters: ListingSearchFilters = {};

  const propertyType = firstValue(searchParams.propertyType);
  if (propertyType && PROPERTY_TYPE_BY_QUERY[propertyType]) {
    filters.propertyType = PROPERTY_TYPE_BY_QUERY[propertyType];
  }

  const transactionType = firstValue(searchParams.transactionType);
  if (transactionType && TRANSACTION_TYPE_BY_QUERY[transactionType]) {
    filters.transactionType = TRANSACTION_TYPE_BY_QUERY[transactionType];
  }

  const priceRange = firstValue(searchParams.priceRange);
  if (priceRange && PRICE_RANGE_BOUNDS[priceRange]) {
    Object.assign(filters, PRICE_RANGE_BOUNDS[priceRange]);
  }

  if (firstValue(searchParams.featured) === "true") {
    filters.featured = true;
  }

  const complexId = firstValue(searchParams.complexId);
  if (complexId && complexId.trim() !== "") {
    filters.complexId = complexId.trim();
  }

  return filters;
}

export function hasActiveFilters(filters: ListingSearchFilters): boolean {
  return Object.keys(filters).length > 0;
}

/** 현재 선택값으로 /listings에 붙일 쿼리 문자열을 만듭니다. "전체"(빈 값)는 제외합니다. */
export function buildListingSearchQuery(selection: {
  propertyType: string;
  transactionType: string;
  priceRange: string;
  /** Header 드롭다운에서 넘어온 단지 필터. 필터 폼을 다시 제출해도 유지합니다. */
  complexId?: string;
}): string {
  const params = new URLSearchParams();
  if (selection.propertyType) params.set("propertyType", selection.propertyType);
  if (selection.transactionType) params.set("transactionType", selection.transactionType);
  if (selection.priceRange) params.set("priceRange", selection.priceRange);
  if (selection.complexId) params.set("complexId", selection.complexId);
  return params.toString();
}
