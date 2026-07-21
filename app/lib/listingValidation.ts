import type {
  Listing,
  ListingStatus,
  PropertyType,
  TransactionType,
} from "../data/listings";

const TRANSACTION_TYPES: TransactionType[] = ["매매", "전세", "월세"];
const PROPERTY_TYPES: PropertyType[] = [
  "아파트",
  "오피스텔",
  "상가",
  "단독주택",
  "기타",
];
const LISTING_STATUSES: ListingStatus[] = ["draft", "published"];

const REQUIRED_STRING_FIELDS = ["id", "complexId"] as const;

/**
 * 공개(published) 상태에서는 비어있으면 안 되지만, 임시저장(draft) 상태에서는
 * 파서가 인식하지 못해 빈 값일 수 있는 문자열 필드(조건 6: 인식 실패 값은
 * 빈 값으로 남겨두고, 관리자가 검토 후 공개 전환 전에 채워 넣습니다).
 */
const REQUIRED_WHEN_PUBLISHED_STRING_FIELDS = [
  "priceLabel",
  "direction",
  "moveInDate",
  "shortDescription",
  "maintenanceFee",
] as const;

/** 값이 있으면 좋지만 파서가 채워주지 못해 비어있을 수 있는(공란 허용) 문자열 필드. */
const OPTIONAL_BLANK_STRING_FIELDS = ["building"] as const;

const REQUIRED_NUMBER_FIELDS = [
  "price",
  "floor",
  "totalFloors",
  "supplyArea",
  "exclusiveArea",
  "roomCount",
  "bathroomCount",
] as const;

/**
 * 요청 본문 형태만 검사합니다(필수값/타입). id 중복·단지 존재 여부, "새 단지 추가"
 * 처리처럼 DB 조회/쓰기가 필요한 검증은 이 함수를 호출하는 API 라우트에서
 * 별도로 수행합니다. 이 함수를 호출하는 시점에는 complexId가 이미 확정돼
 * 있어야 합니다(기존 단지 선택 또는 새 단지 생성 완료 후).
 */
export function parseListingPayload(input: unknown): {
  listing?: Listing;
  errors: string[];
} {
  if (typeof input !== "object" || input === null) {
    return { errors: ["요청 본문이 올바르지 않습니다."] };
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof data[field] !== "string" || (data[field] as string).trim() === "") {
      errors.push(`${field} 값이 비어있습니다.`);
    }
  }

  const isDraft = data.status === "draft";
  for (const field of REQUIRED_WHEN_PUBLISHED_STRING_FIELDS) {
    if (typeof data[field] !== "string") {
      errors.push(`${field} 값이 올바르지 않습니다.`);
    } else if (!isDraft && (data[field] as string).trim() === "") {
      errors.push(`${field} 값이 비어있습니다.`);
    }
  }

  for (const field of OPTIONAL_BLANK_STRING_FIELDS) {
    if (typeof data[field] !== "string") {
      errors.push(`${field} 값이 올바르지 않습니다.`);
    }
  }

  for (const field of REQUIRED_NUMBER_FIELDS) {
    if (typeof data[field] !== "number" || !Number.isFinite(data[field])) {
      errors.push(`${field} 값이 올바르지 않습니다.`);
    }
  }

  if (
    typeof data.transactionType !== "string" ||
    !TRANSACTION_TYPES.includes(data.transactionType as TransactionType)
  ) {
    errors.push("거래유형이 올바르지 않습니다.");
  }

  if (
    typeof data.propertyType !== "string" ||
    !PROPERTY_TYPES.includes(data.propertyType as PropertyType)
  ) {
    errors.push("매물종류가 올바르지 않습니다.");
  }

  if (
    typeof data.status !== "string" ||
    !LISTING_STATUSES.includes(data.status as ListingStatus)
  ) {
    errors.push("공개 상태 값이 올바르지 않습니다.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const listing: Listing = {
    id: data.id as string,
    complexId: data.complexId as string,
    propertyType: data.propertyType as PropertyType,
    status: data.status as ListingStatus,
    transactionType: data.transactionType as TransactionType,
    price: data.price as number,
    priceLabel: data.priceLabel as string,
    building: data.building as string,
    floor: data.floor as number,
    totalFloors: data.totalFloors as number,
    supplyArea: data.supplyArea as number,
    exclusiveArea: data.exclusiveArea as number,
    roomCount: data.roomCount as number,
    bathroomCount: data.bathroomCount as number,
    direction: data.direction as string,
    moveInDate: data.moveInDate as string,
    maintenanceFee: data.maintenanceFee as string,
    shortDescription: data.shortDescription as string,
    features: Array.isArray(data.features)
      ? (data.features as string[]).filter(
          (feature) => typeof feature === "string" && feature.trim() !== "",
        )
      : [],
    image: typeof data.image === "string" ? data.image : undefined,
    images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
    naverUrl: typeof data.naverUrl === "string" ? data.naverUrl : undefined,
    articleNumber:
      typeof data.articleNumber === "string" ? data.articleNumber : undefined,
    verifiedDate:
      typeof data.verifiedDate === "string" ? data.verifiedDate : undefined,
    isFeatured: Boolean(data.isFeatured),
    sourceType: typeof data.sourceType === "string" ? data.sourceType : undefined,
    sourceArticleId:
      typeof data.sourceArticleId === "string" && data.sourceArticleId.trim() !== ""
        ? data.sourceArticleId
        : undefined,
    rawSourceText:
      typeof data.rawSourceText === "string" ? data.rawSourceText : undefined,
  };

  return { listing, errors: [] };
}
