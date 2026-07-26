export interface UnitTypeImage {
  id: string;
  complexId: string;
  /** 평형 타입("108B" 등). 같은 단지 + 같은 타입이면 여러 매물이 공용으로 씁니다. */
  unitType: string;
  url: string;
  /** 같은 (complexId, unitType) 사진 목록에서의 순서. 0번째가 대표사진. */
  sortOrder: number;
}
