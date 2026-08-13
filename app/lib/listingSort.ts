/**
 * 매물 목록 정렬 옵션. URL 쿼리(?sort=updated_desc)와 화면 드롭다운,
 * DB 쿼리(getAllListings)가 전부 이 하나의 어휘를 공유합니다.
 */
export type ListingSortKey =
  | "updated_desc"
  | "updated_asc"
  | "price_desc"
  | "price_asc"
  | "created_desc"
  | "verified_asc";

export const DEFAULT_LISTING_SORT: ListingSortKey = "updated_desc";

export const LISTING_SORT_OPTIONS: { value: ListingSortKey; label: string }[] = [
  { value: "updated_desc", label: "최신 업데이트순" },
  { value: "updated_asc", label: "오래된 순" },
  { value: "price_desc", label: "가격 높은 순" },
  { value: "price_asc", label: "가격 낮은 순" },
  { value: "created_desc", label: "등록일 최신순" },
];

/** 관리자 화면 전용 — 공개 목록엔 의미 없는 "마지막 확인일" 정렬까지 포함합니다. */
export const ADMIN_LISTING_SORT_OPTIONS: { value: ListingSortKey; label: string }[] = [
  ...LISTING_SORT_OPTIONS,
  { value: "verified_asc", label: "마지막 확인일 오래된 순" },
];

interface SortColumnSpec {
  column: string;
  ascending: boolean;
  /**
   * last_verified_at은 한 번도 확인 안 한 매물이 null입니다. "오래 방치된
   * 매물 찾기용" 정렬이라, null(한 번도 확인 안 함)이 가장 오래됐다고 보고
   * 맨 앞으로 오게 합니다(Postgres 기본은 ASC일 때 null이 맨 뒤라 명시가 필요).
   */
  nullsFirst?: boolean;
}

/** DB 컬럼은 이미 숫자/시간 타입이라(price integer, updated_at/created_at/last_verified_at timestamptz) 정렬이 DB 쿼리 단계에서 정확하게 처리됩니다. */
const SORT_COLUMNS: Record<ListingSortKey, SortColumnSpec> = {
  updated_desc: { column: "updated_at", ascending: false },
  updated_asc: { column: "updated_at", ascending: true },
  price_desc: { column: "price", ascending: false },
  price_asc: { column: "price", ascending: true },
  created_desc: { column: "created_at", ascending: false },
  verified_asc: { column: "last_verified_at", ascending: true, nullsFirst: true },
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

export function getListingSortColumn(key: ListingSortKey): SortColumnSpec {
  return SORT_COLUMNS[key];
}
