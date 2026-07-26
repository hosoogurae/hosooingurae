/**
 * 매물 상세페이지 "사진" 갤러리 전용: 매물 개별 사진 → 타입 공통 사진 →
 * 단지 공통 사진 순서로 이어붙여 하나의 배열을 만듭니다(택1 폴백이 아니라
 * 순서대로 합치는 방식). 카드/목록/히어로의 "대표사진 한 장"에는 이 배열의
 * [0]을 쓰지 마세요 — 단지/타입 공통사진이 대표사진으로 뜰 수 있습니다.
 * 대표사진은 resolveListingHeroImage()를 쓰세요.
 */
export function resolveListingGallery({
  listingImages,
  unitTypeImages,
  complexImages,
}: {
  listingImages?: string[];
  unitTypeImages?: string[];
  complexImages?: string[];
}): string[] {
  return [
    ...(listingImages ?? []),
    ...(unitTypeImages ?? []),
    ...(complexImages ?? []),
  ];
}

/**
 * 카드/목록/추천매물/AI추천/상세페이지 히어로가 쓰는 "매물 개별 사진"
 * 대표 이미지입니다. 의도적으로 평면도·타입 공통사진·단지 공통사진은
 * 포함하지 않습니다 — 이 값이 없을 때 평면도로 폴백하는 처리는 호출부가
 * 별도 분기(평면도 전용 스타일: object-contain + "OO 평면도" 라벨)로
 * 직접 하고, 타입/단지 공통사진은 대표사진 후보에 아예 들어가지 않습니다.
 */
export function resolveListingHeroImage(listing: {
  images?: string[];
  image?: string;
}): string | undefined {
  return listing.images?.[0] ?? listing.image;
}
