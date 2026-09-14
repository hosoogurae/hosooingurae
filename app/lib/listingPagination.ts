import type { RawSearchParams } from "./listingFilters";

/** 한 페이지에 보여줄 매물 건수. */
export const LISTINGS_PAGE_SIZE = 24;

/** 이보다 큰 page 값은 실제 페이지 수와 무관하게 파싱 단계에서 걸러냅니다(비정상적으로 큰 offset 방지). */
const MAX_REASONABLE_PAGE = 100_000;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * ?page= 값을 1 이상의 정수로 해석합니다. 없거나, 정수가 아니거나, 1보다
 * 작거나, 터무니없이 크면 전부 1로 봅니다(에러를 내지 않고 조용히 보정) —
 * 실제로 전체 페이지 수를 넘는지는 이 시점엔 알 수 없으므로(DB 조회 전),
 * 그 보정은 listings/page.tsx가 totalCount를 받은 뒤 따로 합니다.
 */
export function parseListingPage(value: string | string[] | undefined): number {
  const raw = firstValue(value);
  if (raw === undefined) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_REASONABLE_PAGE);
}

/** raw 값이 정규화된 page 문자열과 정확히 일치하는지(=이상한 값이 아니었는지). */
export function isRawPageValueMalformed(
  value: string | string[] | undefined,
  parsedPage: number,
): boolean {
  const raw = firstValue(value);
  if (raw === undefined) return false;
  return raw !== String(parsedPage);
}

const PRESERVED_PARAM_KEYS = [
  "propertyType",
  "transactionType",
  "priceRange",
  "complexId",
  "sort",
] as const;

/**
 * 현재 검색 조건(필터+정렬)을 유지한 채 page만 바꾼 /listings 주소를
 * 만듭니다. 실제 페이지 이동 링크(ListingsPagination)에 씁니다 — 정렬은
 * 그대로 유지해야 하므로 buildListingsCanonicalPath와 달리 sort를 포함합니다.
 * page가 1이면 주소를 깨끗하게 유지하기 위해 page 파라미터를 아예 뺍니다.
 */
export function buildListingsPageHref(currentParams: RawSearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const key of PRESERVED_PARAM_KEYS) {
    const value = firstValue(currentParams[key]);
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/listings?${query}` : "/listings";
}

/**
 * canonical 태그 전용 주소. sort는 뺍니다 — 같은 필터+페이지를 정렬만 다르게
 * 본 주소들은 매물 구성 자체는 같은(순서만 다른) 사실상 중복 콘텐츠라,
 * 하나(기본 정렬)로 신호를 모아주기 위함입니다. 반면 필터는 실제로 다른
 * 매물 집합을 가리키므로 canonical도 각 조합을 그대로 유지합니다.
 */
export function buildListingsCanonicalPath(currentParams: RawSearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const key of PRESERVED_PARAM_KEYS) {
    if (key === "sort") continue;
    const value = firstValue(currentParams[key]);
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/listings?${query}` : "/listings";
}

export interface ListingsPageRedirectDecision {
  totalPages: number;
  /** 실제로 렌더링해야 할 페이지(요청값이 유효하면 요청값과 같습니다). */
  effectivePage: number;
  /** true면 주소가 화면과 어긋나므로 effectivePage로 리다이렉트해야 합니다. */
  shouldRedirect: boolean;
}

/**
 * 요청한 page(parseListingPage로 이미 1 이상 정수로 보정된 값)가 실제로
 * 유효한지 판단합니다. totalCount가 0이어도 totalPages는 항상 1
 * 이상이므로(Math.max) effectivePage는 항상 1로 수렴합니다 — 필터 결과가
 * 0건이어도 반복 리다이렉트에 빠지지 않고 "결과 없음" 화면에서 멈추는
 * 이유가 이것입니다(?page=99에 0건 결과 → 1로 리다이렉트 → 다음 요청은
 * page 파라미터가 아예 없어 더 이상 리다이렉트되지 않음).
 */
export function resolveListingsPageRedirect(
  requestedPage: number,
  rawPageParam: string | string[] | undefined,
  totalCount: number,
  pageSize: number,
): ListingsPageRedirectDecision {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(requestedPage, totalPages);
  const malformed = isRawPageValueMalformed(rawPageParam, requestedPage);
  return {
    totalPages,
    effectivePage,
    shouldRedirect: malformed || effectivePage !== requestedPage,
  };
}

export type PageNumberEntry = number | "ellipsis";

/**
 * 페이지 번호를 "1 … 4 5 6 … 20"처럼 접어서 보여줄 목록을 만듭니다. 항상
 * 1번째·마지막 페이지와, 현재 페이지 좌우 1개씩을 보여주고 나머지는
 * "ellipsis"로 표시합니다 — 페이지가 아무리 많아져도 보여주는 개수가
 * 고정 폭(최대 7개) 안에 머뭅니다.
 */
export function getPageNumbersToShow(current: number, total: number): PageNumberEntry[] {
  if (total <= 0) return [];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: PageNumberEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap === 2) {
        // 딱 하나만 가려지는 경우 생략(…) 대신 그 번호를 그대로 보여줍니다
        // — 숫자 하나 가리자고 "…"를 쓰면 오히려 자리만 더 차지합니다.
        result.push(sorted[i - 1] + 1);
      } else if (gap > 2) {
        result.push("ellipsis");
      }
    }
    result.push(sorted[i]);
  }
  return result;
}
