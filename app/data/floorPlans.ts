export interface FloorPlanImage {
  id: string;
  complexId: string;
  /** 평형 타입("108B" 등, 네이버 표기 기준). 같은 단지 + 같은 타입이면 여러 매물이 공용으로 씁니다. */
  unitType: string;
  /** ㎡ 단위 공급면적. 매물 원문에서 파싱된 공급면적과 자동 매칭할 때 씁니다. 없을 수 있음. */
  supplyArea?: number;
  /** ㎡ 단위 전용면적. 매물 원문에서 파싱된 전용면적과 자동 매칭할 때 씁니다. 없을 수 있음. */
  exclusiveArea?: number;
  url: string;
  sortOrder: number;
}
