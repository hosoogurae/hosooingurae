/**
 * 매물 개별 사진 → 타입 공통 사진 → 단지 공통 사진 순서로 이어붙여 하나의
 * 갤러리 배열을 만듭니다(택1 폴백이 아니라 순서대로 합치는 방식). 대표
 * 이미지(카드/히어로)가 필요하면 이 배열의 [0]을 쓰면 됩니다.
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
