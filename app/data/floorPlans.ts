export interface FloorPlanImage {
  id: string;
  complexId: string;
  /** 평형 타입("84A" 등). 같은 단지 + 같은 타입이면 여러 매물이 공용으로 씁니다. */
  unitType: string;
  url: string;
  sortOrder: number;
}
