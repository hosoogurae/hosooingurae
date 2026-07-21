export type TransactionType = "매매" | "전세" | "월세";

/** 매물종류: 무엇을 파는지(아파트/오피스텔/상가 등). 단지의 법정 건축물 용도와는 다른 개념. */
export type PropertyType = "아파트" | "오피스텔" | "상가" | "단독주택" | "기타";

/** draft(임시저장, 비공개) / published(공개, 홈페이지·목록에 즉시 노출) */
export type ListingStatus = "draft" | "published";

export interface Listing {
  id: string;
  complexId: string;
  propertyType: PropertyType;
  status: ListingStatus;
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
  shortDescription: string;
  features: string[];
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
}

export const listings: Listing[] = [
  {
    id: "hosumaeul-2-201-sale-42000",
    complexId: "hosumaeul-epyeonhansesang-2",
    propertyType: "아파트",
    status: "published",
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
