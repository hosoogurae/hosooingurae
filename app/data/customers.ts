export interface Customer {
  id: string;
  name: string;
  /**
   * 화면에 보여줄 원본 표기 그대로("010-1234-5678"). 전화번호 없이도
   * 고객을 등록/상담 시작할 수 있어야 하므로 optional입니다. 중복 비교는
   * 이 값이 아니라 서버가 별도로 관리하는 정규화 값(phone_normalized)
   * 기준이며, 연락처가 없으면 애초에 중복 검사를 하지 않습니다.
   */
  phone?: string;
  memo?: string;
  desiredTransactionType?: "매매" | "전세" | "월세";
  desiredArea?: string;
  createdAt: string;
  updatedAt: string;
}

/** 신규 고객 생성 입력값. id/시각은 서버가 채웁니다. */
export interface CustomerInput {
  name: string;
  /** 없으면(undefined/빈 문자열) 전화번호 없는 고객으로 등록되며 중복 검사도 건너뜁니다. */
  phone?: string;
  memo?: string;
  desiredTransactionType?: "매매" | "전세" | "월세";
  desiredArea?: string;
}

/** 목록/검색 화면에서 함께 보여줄 파생 정보(최근 상담일 등)를 덧붙인 형태. */
export interface CustomerWithStats extends Customer {
  lastConsultationAt?: string;
  consultationCount: number;
}
