export type TransactionType = "매매" | "전세" | "월세";

/** 매물종류: 무엇을 파는지(아파트/오피스텔/상가 등). */
export type PropertyType = "아파트" | "오피스텔" | "상가" | "단독주택" | "기타";

/** PropertyType의 전체 값 목록. select 드롭다운 등에서 하드코딩하지 말고 재사용하세요.
 * complexes.propertyType도 이 값 체계를 그대로 공유합니다(app/data/complexes.ts의
 * COMPLEX_PROPERTY_TYPES 참고). */
export const PROPERTY_TYPES: readonly PropertyType[] = [
  "아파트",
  "오피스텔",
  "상가",
  "단독주택",
  "기타",
];

/**
 * "평형 타입" 드롭다운에서 그 단지에 평면도가 있는데도 관리자가 의도적으로
 * "이 매물엔 해당 없음"을 고른 경우에만 쓰는 값입니다. 서버가 빈 값(필드를
 * 아예 안 건드린 경우)과 구분할 수 있게 하기 위한 표시일 뿐이라, 저장 직전에
 * 항상 undefined로 바뀌고 DB에는 절대 이 문자열 그대로 들어가지 않습니다
 * (app/lib/floorPlans.ts의 resolveListingUnitType 참고).
 */
export const NO_FLOOR_PLAN_UNIT_TYPE = "__no_floor_plan__";

/** draft(임시저장, 비공개) / published(공개, 홈페이지·목록에 즉시 노출) */
export type ListingStatus = "draft" | "published";

/**
 * 매물의 실제 거래 진행 상태. 기존 status(공개 여부)와는 별개 개념이라
 * 이름이 겹치지 않게 합니다 — status는 "관리자가 공개하기로 했는가",
 * dealStatus는 "이 매물이 실제로 거래 가능한가"입니다.
 * completed/hold는 status와 무관하게 공개 조회에서 항상 제외됩니다
 * (app/lib/listings.ts의 getAllListings/getListingById 참고).
 */
export type DealStatus = "advertising" | "negotiating" | "completed" | "hold";

export interface Listing {
  id: string;
  complexId: string;
  propertyType: PropertyType;
  status: ListingStatus;
  dealStatus: DealStatus;
  /**
   * 관리자가 "오늘 확인" 버튼으로 갱신하는 마지막 확인 시각(ISO 문자열).
   * 네이버 가져오기 시점에 자동으로 채워지는 verifiedDate(날짜만, 공개
   * 노출용 신뢰 배지)와는 다른, 운영 관리 전용 값입니다 — 공개 API에는
   * 노출하지 않습니다.
   */
  lastVerifiedAt?: string;
  transactionType: TransactionType;
  /** 만원 단위 가격 (정렬·필터링용). 매매가/보증금 기준. */
  price: number;
  priceLabel: string;
  building: string;
  floor: number;
  totalFloors: number;
  supplyArea: number;
  exclusiveArea: number;
  roomCount: number;
  bathroomCount: number;
  direction: string;
  moveInDate: string;
  maintenanceFee?: string;
  /** 융자 유무. */
  hasLoan: boolean;
  /** 융자금 원문 문자열 그대로(숫자 변환 없음 — 표기가 다양해 파싱 실패 위험이 커서). hasLoan이 false면 null. */
  loanAmount: string | null;
  shortDescription: string;
  features: string[];
  /** 평형 타입("84A" 등). 값이 있으면 같은 단지·같은 타입의 평면도를 상세페이지에 자동으로 보여줍니다. */
  unitType?: string;
  /** 대표 이미지 경로. 없으면 "매물 사진 준비 중" 플레이스홀더로 대체. */
  image?: string;
  /** 갤러리용 전체 이미지 목록. 추가되는 즉시 상세페이지 갤러리에 자동 반영됨. */
  images?: string[];
  naverUrl?: string;
  /** 네이버 화면에 표시된 매물번호. naverUrl의 articleNo와 다를 수 있어 별도 보관. */
  articleNumber?: string;
  verifiedDate?: string;
  isFeatured: boolean;
  /** 매물 정보의 출처('naver' 등). 수동 등록 매물은 없음. */
  sourceType?: string;
  /** naverUrl의 articleNo. 추출 가능했던 경우에만 존재하며 중복 등록 검사에 사용됨. */
  sourceArticleId?: string;
  /** 관리자가 붙여넣은 원문 전체. 관리자 화면에서만 노출(공개 조회에는 포함되지 않음). */
  rawSourceText?: string;
  /** DB 생성 시각(ISO). "등록일 최신순" 정렬용. */
  createdAt?: string;
  /** DB 마지막 수정 시각(ISO) — DB 트리거가 UPDATE마다 자동 갱신합니다. "최신 업데이트순" 정렬 기본값으로 씁니다. */
  updatedAt?: string;
  /**
   * 관리자가 "거래 의심" 배지를 마지막으로 확인한 시각(ISO). 이 시각 이후
   * 날짜의 실거래가 새로 나타나면 확인 상태가 풀리고 배지가 다시 뜹니다
   * (app/lib/suspectedTransactionMatch.ts 참고). 매칭 결과 자체는 저장하지
   * 않고 매번 국토부 API에서 다시 계산합니다.
   */
  suspectedMatchAcknowledgedAt?: string;
}
