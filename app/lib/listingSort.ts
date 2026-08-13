/**
 * 매물 목록 정렬 옵션. URL 쿼리(?sort=updated_desc)와 화면 드롭다운,
 * DB 쿼리(getAllListings)가 전부 이 하나의 어휘를 공유합니다.
 */
export type ListingSortKey =
  | "updated_desc"
  | "updated_asc"
  | "price_desc"
  | "price_asc"
  | "created_desc";

export const DEFAULT_LISTING_SORT: ListingSortKey = "updated_desc";

export const LISTING_SORT_OPTIONS: { value: ListingSortKey; label: string }[] = [
  { value: "updated_desc", label: "최신 업데이트순" },
  { value: "updated_asc", label: "오래된 순" },
  { value: "price_desc", label: "가격 높은 순" },
  { value: "price_asc", label: "가격 낮은 순" },
  { value: "created_desc", label: "등록일 최신순" },
];

/** DB 컬럼은 이미 숫자/시간 타입이라(price integer, updated_at/created_at timestamptz) 정렬이 DB 쿼리 단계에서 정확하게 처리됩니다. */
const SORT_COLUMNS: Record<ListingSortKey, { column: string; ascending: boolean }> = {
  updated_desc: { column: "updated_at", ascending: false },
  updated_asc: { column: "updated_at", ascending: true },
  price_desc: { column: "price", ascending: false },
  price_asc: { column: "price", ascending: true },
  created_desc: { column: "created_at", ascending: false },
};

export function isListingSortKey(value: unknown): value is ListingSortKey {
  return typeof value === "string" && value in SORT_COLUMNS;
}

/** 인식하지 못하는 값(오타, 옛날 링크의 삭제된 옵션 등)은 조용히 기본값으로 대체합니다. */
export function parseListingSortKey(
  value: string | null | undefined,
): ListingSortKey {
  return isListingSortKey(value) ? value : DEFAULT_LISTING_SORT;
}

export function getListingSortColumn(
  key: ListingSortKey,
): { column: string; ascending: boolean } {
  return SORT_COLUMNS[key];
}
