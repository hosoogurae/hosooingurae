export const COMPLEX_IMAGE_CATEGORIES = [
  "exterior",
  "entrance",
  "landscape",
  "playground",
  "parking",
  "community",
  "other",
] as const;

export type ComplexImageCategory = (typeof COMPLEX_IMAGE_CATEGORIES)[number];

export const COMPLEX_IMAGE_CATEGORY_LABELS: Record<ComplexImageCategory, string> = {
  exterior: "단지 외관",
  entrance: "정문",
  landscape: "조경",
  playground: "놀이터",
  parking: "지하주차장",
  community: "커뮤니티 시설",
  other: "기타",
};

export interface ComplexImage {
  id: string;
  complexId: string;
  category: ComplexImageCategory;
  url: string;
  /** 단지 공통 사진 전체(카테고리 구분 없이)에서의 순서. 0번째가 대표사진. */
  sortOrder: number;
}
