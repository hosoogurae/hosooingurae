import { PROPERTY_TYPES, type PropertyType } from "./listings";

export interface ComplexTransportation {
  subway?: string;
  subwayDistance?: string;
  /** 지하철역까지 도보 시간(분). 관리자가 직접 입력한 값만 있고, 없으면 추정하지 않습니다. */
  subwayWalkMinutes?: number;
  buses?: string[];
}

/** 단지 등록 화면에서 선택 가능한 매물종류. listings.propertyType과 값 체계를
 * 공유합니다(2026-09-02, '공동주택' 같은 레거시 값이 흩어지는 문제를 정리하며
 * PROPERTY_TYPES로 통일 — app/data/listings.ts 참고). */
export const COMPLEX_PROPERTY_TYPES = PROPERTY_TYPES;

export interface ComplexMolitLink {
  /** 국토교통부 실거래가 API 지역코드(시군구 5자리, LAWD_CD) */
  lawdCode: string;
  /** 국토교통부 실거래가 API의 단지 고유코드(aptSeq). 아파트명 표기가 실거래가 데이터와
   * 다를 수 있어(예: "e" vs "이") 이름 대신 이 값으로 정확히 매칭합니다. */
  aptSeq: string;
}

export interface Complex {
  id: string;
  name: string;
  address: string;
  /** 매물종류(아파트/오피스텔/상가/단독주택/기타) — listings.propertyType과 같은
   * 값 체계(PropertyType)를 공유합니다. 법정 건축물대장상의 용도(제1종근린생활시설
   * 등)를 따로 기록할 필요가 생기면 이 필드에 겹쳐 넣지 말고 별도 컬럼을 만드세요. */
  propertyType?: PropertyType;
  /** 아래 세부 정보는 관리자가 "새 단지 추가"로 빠르게 등록할 때는 비워둘 수 있습니다. */
  approvalDate?: string;
  totalHouseholds?: number;
  buildings?: number;
  parkingCount?: number;
  parkingPerHousehold?: number;
  heating?: string;
  hallwayType?: string;
  builder?: string;
  maxFloor?: number;
  /** 용적률(%) */
  floorAreaRatio?: number;
  /** 건폐율(%) */
  buildingCoverageRatio?: number;
  managementOfficePhone?: string;
  managementFeeWon?: number;
  managementFeeRaw?: string;
  /** 관리비 기준연월(YYYY-MM). */
  managementFeeAsOf?: string;
  nearbySchools: string[];
  transportation: ComplexTransportation;
  features: string[];
  /** 국토교통부 실거래가 API 연동 정보. 없으면 mock 실거래가 데이터만 사용합니다. */
  molit?: ComplexMolitLink;
}

export const complexes: Complex[] = [
  {
    id: "hosumaeul-epyeonhansesang-2",
    name: "호수마을e편한세상2단지",
    address: "경기도 김포시 구래동 6874-17",
    propertyType: "아파트",
    approvalDate: "2013-02-26",
    totalHouseholds: 1167,
    buildings: 12,
    parkingCount: 1569,
    parkingPerHousehold: 1.34,
    heating: "지역난방 / 열병합",
    hallwayType: "복합식",
    builder: "대림산업(주) 외 4",
    nearbySchools: ["김포호수초등학교", "한가람중학교", "호수고등학교"],
    transportation: {
      subway: "구래역",
      subwayDistance: "약 664m, 도보 약 12분",
    },
    features: [
      "전용 84㎡ 중심 단지",
      "김포호수공원 인접",
      "구래역 생활권",
      "단지 내 상가와 주변 생활편의시설 이용 가능",
      "세대당 주차 1.34대",
      "김포호수초등학교 도보권",
    ],
    molit: {
      lawdCode: "41570",
      aptSeq: "41570-744",
    },
  },
];
