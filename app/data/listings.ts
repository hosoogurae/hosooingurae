export type TransactionType = "매매" | "전세" | "월세";

/** 매물종류: 무엇을 파는지(아파트/오피스텔/상가 등). 단지의 법정 건축물 용도와는 다른 개념. */
export type PropertyType = "아파트" | "오피스텔" | "상가" | "단독주택" | "기타";

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

export const listings: Listing[] = [
  {
    id: "hosumaeul-2-201-sale-42000",
    complexId: "hosumaeul-epyeonhansesang-2",
    propertyType: "아파트",
    status: "published",
    dealStatus: "advertising",
    transactionType: "매매",
    price: 42000,
    priceLabel: "4억 2,000만원",
    building: "201동",
    floor: 16,
    totalFloors: 20,
    supplyArea: 109.04,
    exclusiveArea: 84.87,
    roomCount: 3,
    bathroomCount: 2,
    direction: "거실 기준 남향",
    moveInDate: "협의 가능",
    maintenanceFee: "약 28만원",
    hasLoan: false,
    loanAmount: null,
    shortDescription:
      "남향의 탁 트인 전망과 우수한 관리 상태가 돋보이는 84A 타입",
    features: [
      "남향",
      "탁 트인 전망",
      "상태 최상",
      "안방 붙박이장",
      "빠른 입주 협의 가능",
      "초등학교 도보권",
      "구래역 생활권",
      "김포호수공원 인접",
    ],
    naverUrl:
      "https://new.land.naver.com/complexes/101347?ms=2APB1P,3z2KEn,16&a=APT:ABYG:JGC&e=RETAIL&articleNo=2637262410&realtorId=dudbhosoo",
    articleNumber: "2638295837",
    verifiedDate: "2026-07-16",
    isFeatured: true,
  },
];
