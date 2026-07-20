export type PropertyType = "아파트" | "오피스텔" | "상가";

export interface Property {
  id: string;
  type: PropertyType;
  title: string;
  price: string;
  location: string;
  area: string;
  features: string[];
}

export const featuredProperties: Property[] = [
  {
    id: "gurae-officetel-01",
    type: "오피스텔",
    title: "구래역 도보 5분 신축 오피스텔",
    price: "2억 3,000만원",
    location: "김포시 구래동",
    area: "전용 26㎡ (10평)",
    features: ["역세권", "풀옵션", "투자용"],
  },
  {
    id: "gurae-store-01",
    type: "상가",
    title: "구래동 메인상권 1층 상가",
    price: "월세 150만원 / 보증금 3,000만원",
    location: "김포시 구래동",
    area: "전용 46㎡ (14평)",
    features: ["1층 코너", "유동인구 多", "권리금 없음"],
  },
];
