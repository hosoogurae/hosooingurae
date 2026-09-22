import type { Complex } from "../data/complexes";
import type { Listing } from "../data/listings";
import { getAllComplexes, getComplexById } from "./complexes";
import type { ListingSearchFilters } from "./listingFilters";
import {
  DEFAULT_LISTING_SORT,
  getListingSortColumn,
  type ListingSortKey,
} from "./listingSort";
import { getSupabaseClient } from "./supabase/client";
import type { ListingRow } from "./supabase/database.types";
import { listingRowToListing } from "./supabase/mappers";

export interface ListingWithComplex extends Listing {
  complex: Complex;
}

/**
 * listings 테이블의 모든 컬럼 중 관리자 전용 필드를 뺀 목록. 공개 조회
 * (getAllListings의 includeDrafts=false 경로)는 이 컬럼들을 절대 쓰지
 * 않으므로 select 단계에서부터 가져오지 않습니다 — "우연히 안 새는" 상태에
 * 기대지 않고, 애초에 공개 쿼리 결과에 값 자체가 없게 만드는 것이 목적입니다.
 * listingRowToListing이 이 컬럼 외의 모든 필드를 무조건 읽으므로, 여기서
 * 더 줄이면 다른 화면(recommend/compare 등)이 조용히 깨질 수 있어 신중하게
 * 골라야 합니다.
 *
 * - raw_source_text: 네이버 원문 스크랩 전체 텍스트.
 * - article_number: 네이버 매물번호. 손님에게 절대 노출하면 안 되는 값이라
 *   관리자 조회(includeDrafts=true, select("*"))에서만 가져옵니다.
 */
const PUBLIC_LISTING_COLUMNS =
  "id, complex_id, property_type, status, deal_status, last_verified_at, " +
  "transaction_type, price, price_label, building, floor, total_floors, " +
  "supply_area, exclusive_area, room_count, bathroom_count, direction, " +
  "move_in_date, maintenance_fee, has_loan, loan_amount, short_description, " +
  "features, naver_url, verified_date, is_featured, " +
  "source_type, source_article_id, unit_type, created_at, updated_at, " +
  "suspected_match_acknowledged_at";

/**
 * 로그인 없이 누구나 호출 가능한 공개 API(app/api/listings) 응답 형태.
 * rawSourceText, sourceType, sourceArticleId, status 등 관리자 전용/내부 정보는
 * 절대 포함하지 않습니다 — 그런 정보가 필요하면 app/api/admin/listings를 씁니다.
 */
export interface PublicListing {
  id: string;
  title: string;
  complexId: string;
  complexName: string;
  propertyType: string;
  transactionType: string;
  price: number;
  priceLabel: string;
  building: string;
  supplyArea: number;
  exclusiveArea: number;
  floor: number;
  totalFloors: number;
  direction: string;
  roomCount: number;
  bathroomCount: number;
  moveInDate: string;
  maintenanceFee?: string;
  description: string;
  features: string[];
  thumbnail?: string;
  images?: string[];
  naverUrl?: string;
  verifiedDate?: string;
  isFeatured: boolean;
  /**
   * 계약 진행중 여부(고객 오해 방지용 안전 표시값). 내부 관리 값인
   * dealStatus 원본은 공개 API에 절대 노출하지 않고, 이 boolean으로만
   * 변환해서 내려줍니다.
   */
  isNegotiating: boolean;
}

export interface ListingStats {
  total: number;
  published: number;
  featured: number;
  byPropertyType: Record<"아파트" | "오피스텔" | "상가", number>;
  /** deal_status가 advertising/negotiating이면서 확인이 필요한(8일 이상/미확인) 매물 수. */
  needsVerification: number;
}

/**
 * 관리자 매물 관리 화면 상단 통계 카드용. 행 데이터를 내려받지 않고
 * count(head: true)만 조회해 매물 수가 늘어나도 가벼운 상태를 유지합니다.
 */
export async function getListingStats(): Promise<ListingStats> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      total: 0,
      published: 0,
      featured: 0,
      byPropertyType: { 아파트: 0, 오피스텔: 0, 상가: 0 },
      needsVerification: 0,
    };
  }

  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [total, published, featured, apartment, officetel, retail, needsVerification] =
    await Promise.all([
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("is_featured", true),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("property_type", "아파트"),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("property_type", "오피스텔"),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("property_type", "상가"),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .in("deal_status", ["advertising", "negotiating"])
        .or(`last_verified_at.is.null,last_verified_at.lte.${fourteenDaysAgo}`),
    ]);

  for (const [label, result] of [
    ["전체", total],
    ["공개", published],
    ["대표매물", featured],
    ["아파트", apartment],
    ["오피스텔", officetel],
    ["상가", retail],
    ["확인 필요", needsVerification],
  ] as const) {
    if (result.error) {
      console.error(`[listings] ${label} 통계 조회 실패`, result.error);
    }
  }

  return {
    total: total.count ?? 0,
    published: published.count ?? 0,
    featured: featured.count ?? 0,
    byPropertyType: {
      아파트: apartment.count ?? 0,
      오피스텔: officetel.count ?? 0,
      상가: retail.count ?? 0,
    },
    needsVerification: needsVerification.count ?? 0,
  };
}

export function toPublicListing(listing: ListingWithComplex): PublicListing {
  return {
    id: listing.id,
    title: `${listing.complex.name} ${listing.transactionType} ${listing.priceLabel}`,
    complexId: listing.complexId,
    complexName: listing.complex.name,
    propertyType: listing.propertyType,
    transactionType: listing.transactionType,
    price: listing.price,
    priceLabel: listing.priceLabel,
    building: listing.building,
    supplyArea: listing.supplyArea,
    exclusiveArea: listing.exclusiveArea,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    direction: listing.direction,
    roomCount: listing.roomCount,
    bathroomCount: listing.bathroomCount,
    moveInDate: listing.moveInDate,
    maintenanceFee: listing.maintenanceFee,
    description: listing.shortDescription,
    features: listing.features,
    thumbnail: listing.images?.[0] ?? listing.image,
    images: listing.images,
    naverUrl: listing.naverUrl,
    verifiedDate: listing.verifiedDate,
    isFeatured: listing.isFeatured,
    isNegotiating: listing.dealStatus === "negotiating",
  };
}

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>;

/** 여러 매물의 이미지를 한 번에 조회해 listing_id별로 묶습니다(sort_order 순). */
async function fetchImagesByListingId(
  supabase: SupabaseClient,
  rows: ListingRow[],
): Promise<Map<string, string[]>> {
  if (rows.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("listing_images")
    .select("listing_id, url, sort_order")
    .in(
      "listing_id",
      rows.map((row) => row.id),
    )
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[listings] 매물 이미지 조회 실패", error);
    return new Map();
  }

  const grouped = new Map<string, string[]>();
  for (const image of data) {
    const urls = grouped.get(image.listing_id) ?? [];
    urls.push(image.url);
    grouped.set(image.listing_id, urls);
  }
  return grouped;
}

/**
 * naverTextParser.ts의 매물번호 추출 정규식(/매물\s*번호\s*[:：]?\s*(\d{6,})/)이
 * 이미 "6자리 미만은 진짜 매물번호로 안 친다"고 정해둔 기준입니다. 검색어에서
 * 뽑은 숫자가 이보다 짧으면(예: "201동" 검색의 "2") article_number ilike가
 * 웬만한 매물에 다 걸려버려 엉뚱한 결과가 섞이므로, 매물번호 검색 자체를
 * 건너뜁니다.
 */
const MIN_ARTICLE_NUMBER_SEARCH_DIGITS = 6;

/**
 * 검색어(단지명·동·내부ID·매물번호)에 매칭되는 매물 id 목록을 DB 쿼리로
 * 찾습니다. 각 조건을 별도의 안전한(파라미터화된) 쿼리로 찾은 뒤 합칩니다 —
 * PostgREST .or() 문자열에 사용자 입력을 그대로 끼워 넣으면 쉼표/괄호로
 * 필터 구문 자체가 깨지거나 의도치 않은 조건이 섞일 위험이 있어 피합니다.
 */
async function resolveSearchListingIds(
  supabase: SupabaseClient,
  query: string,
): Promise<string[]> {
  // %, _는 ilike 와일드카드라서 검색어에 그대로 있으면 리터럴로 이스케이프합니다.
  const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;
  // 매물번호는 숫자만 저장돼 있으므로, 검색어에 섞인 글자(예: "매물번호
  // 2648856867"을 그대로 붙여넣은 경우)를 무시하고 숫자만 뽑아 비교합니다.
  const digitsOnly = query.replace(/[^0-9]/g, "");
  const articleNumberPattern =
    digitsOnly.length >= MIN_ARTICLE_NUMBER_SEARCH_DIGITS ? `%${digitsOnly}%` : null;

  const [complexMatches, buildingMatches, idMatches, articleNumberMatches] = await Promise.all([
    supabase.from("complexes").select("id").ilike("name", pattern),
    supabase.from("listings").select("id").ilike("building", pattern),
    supabase.from("listings").select("id").ilike("id", pattern),
    articleNumberPattern
      ? supabase.from("listings").select("id").ilike("article_number", articleNumberPattern)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const matchedComplexIds = (complexMatches.data ?? []).map((row) => row.id);
  const byComplexName = matchedComplexIds.length > 0
    ? await supabase.from("listings").select("id").in("complex_id", matchedComplexIds)
    : { data: [] as { id: string }[] };

  const ids = new Set<string>();
  for (const row of byComplexName.data ?? []) ids.add(row.id);
  for (const row of buildingMatches.data ?? []) ids.add(row.id);
  for (const row of idMatches.data ?? []) ids.add(row.id);
  for (const row of articleNumberMatches.data ?? []) ids.add(row.id);

  return Array.from(ids);
}

function attachComplexes(
  listings: Listing[],
  complexes: Complex[],
): ListingWithComplex[] {
  const complexById = new Map(complexes.map((complex) => [complex.id, complex]));
  const result: ListingWithComplex[] = [];

  for (const listing of listings) {
    const complex = complexById.get(listing.complexId);
    if (complex) {
      result.push({ ...listing, complex });
    } else if (listing.propertyType === "상가" && !listing.complexId) {
      result.push({ ...listing, complex: standaloneCommercialComplex(listing) });
    }
  }

  return result;
}

function standaloneCommercialComplex(listing: Listing): Complex {
  return {
    id: `standalone-${listing.id}`,
    name: listing.building.trim() || "상가",
    address: "",
    propertyType: "상가",
    nearbySchools: [],
    transportation: {},
    features: [],
  };
}

/**
 * 검색어 필터를 먼저 매물 id 목록으로 풀어냅니다. getAllListings와
 * getListingsPage가 똑같이 씁니다 — 검색어가 있는데 매칭되는 매물이
 * 하나도 없으면(searchMatchedIds가 빈 배열) 호출부가 메인 쿼리를 보낼
 * 필요 없이 바로 "0건"으로 처리할 수 있도록 null과 구분해서 돌려줍니다.
 */
async function resolveSearchFilter(
  supabase: SupabaseClient,
  filters: ListingSearchFilters | undefined,
): Promise<{ searchMatchedIds: string[] | null; matchedNothing: boolean }> {
  if (!filters?.search || filters.search.trim() === "") {
    return { searchMatchedIds: null, matchedNothing: false };
  }
  const searchMatchedIds = await resolveSearchListingIds(supabase, filters.search.trim());
  return { searchMatchedIds, matchedNothing: searchMatchedIds.length === 0 };
}

/**
 * status/deal_status 기본 조건 + 검색 필터(propertyType 등)를 쿼리에
 * 체이닝합니다. getAllListings와 getListingsPage가 완전히 같은 필터 규칙을
 * 쓰도록 공용화한 것 — 필터를 하나 추가/변경할 때 이 함수만 고치면 두
 * 함수가 같이 갱신됩니다.
 */
function applyListingFilters<
  Q extends {
    eq(column: string, value: unknown): Q;
    in(column: string, values: unknown[]): Q;
    gte(column: string, value: unknown): Q;
    lte(column: string, value: unknown): Q;
  },
>(
  query: Q,
  filters: ListingSearchFilters | undefined,
  options: { includeDrafts?: boolean },
  searchMatchedIds: string[] | null,
): Q {
  let result = query;

  if (!options.includeDrafts) {
    // completed/hold는 status(공개 여부)와 무관하게 항상 공개 조회에서 제외 —
    // 관리자가 status를 따로 안 바꿔도 계약완료/보류 매물이 계속 광고되는
    // 사고를 막기 위함(app/data/listings.ts의 DealStatus 주석 참고).
    result = result.eq("status", "published").in("deal_status", [
      "advertising",
      "negotiating",
    ]);
  }

  if (filters?.propertyType) {
    result = result.eq("property_type", filters.propertyType);
  }
  if (filters?.transactionType) {
    result = result.eq("transaction_type", filters.transactionType);
  }
  if (filters?.featured) {
    result = result.eq("is_featured", true);
  }
  if (filters?.complexId) {
    result = result.eq("complex_id", filters.complexId);
  }
  if (filters?.minPrice !== undefined) {
    result = result.gte("price", filters.minPrice);
  }
  if (filters?.maxPrice !== undefined) {
    result = result.lte("price", filters.maxPrice);
  }
  // 관리자 전용(공개/비공개 필터) — includeDrafts로 draft를 보이게 한 뒤,
  // 이 필터로 공개중/비공개 중 하나만 더 좁힙니다.
  if (filters?.status) {
    result = result.eq("status", filters.status);
  }
  if (searchMatchedIds) {
    result = result.in("id", searchMatchedIds);
  }

  return result;
}

/**
 * 매물 목록을 조회합니다. includeDrafts가 true가 아니면 공개(published) 매물만
 * 반환합니다 — 홈페이지·전체매물 페이지 등 공개 화면은 기본값(false)을 쓰고,
 * 관리자 화면(app/api/listings)만 true로 임시저장 매물까지 봅니다.
 */
export async function getAllListings(
  options: {
    includeDrafts?: boolean;
    filters?: ListingSearchFilters;
    sort?: ListingSortKey;
    limit?: number;
  } = {},
): Promise<ListingWithComplex[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const filters = options.filters;

  const { searchMatchedIds, matchedNothing } = await resolveSearchFilter(supabase, filters);
  if (matchedNothing) {
    return [];
  }

  const { column, ascending, nullsFirst } = getListingSortColumn(
    options.sort ?? DEFAULT_LISTING_SORT,
  );
  let query = supabase
    .from("listings")
    .select(options.includeDrafts ? "*" : PUBLIC_LISTING_COLUMNS)
    .order(column, { ascending, nullsFirst });

  query = applyListingFilters(query, filters, options, searchMatchedIds);

  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  // select()에 동적 문자열(PUBLIC_LISTING_COLUMNS)을 넘기면 Supabase 타입
  // 추론이 컬럼별 타입을 잃으므로, 실행 직전에 .returns()로 실제 행 모양을
  // 명시합니다(raw_source_text만 안 가져올 뿐 나머지는 ListingRow와 동일).
  // .eq()/.order() 등 필터 메서드를 잃지 않도록 체이닝 맨 끝에서만 붙입니다.
  const [{ data: rows, error }, complexes] = await Promise.all([
    query.returns<ListingRow[]>(),
    getAllComplexes(),
  ]);

  if (error || !rows) {
    console.error("[listings] 매물 목록 조회 실패", error);
    return [];
  }

  const imagesByListingId = await fetchImagesByListingId(supabase, rows);
  // 임시저장까지 보는(includeDrafts) 관리자 컨텍스트에서만 원문 텍스트도 함께 내려줍니다.
  const listings = rows.map((row) =>
    listingRowToListing(row, imagesByListingId.get(row.id) ?? [], {
      includeRawSourceText: options.includeDrafts,
    }),
  );

  return attachComplexes(listings, complexes);
}

export interface ListingsPageResult {
  listings: ListingWithComplex[];
  /** 이번 페이지가 아니라 필터 기준 전체 건수. 페이지 수 계산에 씁니다. */
  totalCount: number;
}

/**
 * /listings(공개 전체매물 화면) 전용 페이지네이션 조회입니다. getAllListings와
 * 달리 전체를 가져와 자르지 않고, Supabase에 해당 페이지 범위만 요청합니다
 * (.range()) — 117건을 다 가져오던 걸 24건만 가져오도록 바꾼 지점입니다.
 * 항상 공개(published) 매물만 봅니다(관리자 화면은 다른 경로를 씁니다).
 */
export async function getListingsPage(options: {
  filters?: ListingSearchFilters;
  sort?: ListingSortKey;
  /** 1부터 시작. */
  page: number;
  pageSize: number;
}): Promise<ListingsPageResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { listings: [], totalCount: 0 };
  }

  const filters = options.filters;

  const { searchMatchedIds, matchedNothing } = await resolveSearchFilter(supabase, filters);
  if (matchedNothing) {
    return { listings: [], totalCount: 0 };
  }

  const { column, ascending, nullsFirst } = getListingSortColumn(
    options.sort ?? DEFAULT_LISTING_SORT,
  );
  let query = supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS, { count: "exact" })
    .order(column, { ascending, nullsFirst });

  query = applyListingFilters(query, filters, { includeDrafts: false }, searchMatchedIds);

  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;

  // select()에 동적 문자열을 넘기면 타입 추론을 잃으므로 getAllListings와
  // 동일하게 실행 직전에 .returns()로 행 모양을 명시합니다.
  const [{ data: rows, error, count }, complexes] = await Promise.all([
    query.range(from, to).returns<ListingRow[]>(),
    getAllComplexes(),
  ]);

  if (error) {
    // 요청한 page가 실제 데이터보다 훨씬 뒤에 있으면(offset이 전체 행 수를
    // 넘음) PostgREST가 행을 주는 대신 에러를 냅니다(PGRST103 "Requested
    // range not satisfiable" 등) — count도 함께 못 받습니다. 이 경우 range
    // 없이 건수만 다시 물어봐서, 호출부(listings/page.tsx)가 정확한
    // totalCount로 올바른 마지막 페이지로 리다이렉트할 수 있게 합니다.
    let countOnlyQuery = supabase
      .from("listings")
      .select("id", { count: "exact", head: true });
    countOnlyQuery = applyListingFilters(
      countOnlyQuery,
      filters,
      { includeDrafts: false },
      searchMatchedIds,
    );
    const { count: totalOnly, error: countError } = await countOnlyQuery;
    if (countError) {
      console.error("[listings] 매물 페이지 조회 실패", error);
    }
    return { listings: [], totalCount: totalOnly ?? 0 };
  }

  if (!rows) {
    console.error("[listings] 매물 페이지 조회 실패", error);
    return { listings: [], totalCount: 0 };
  }

  const imagesByListingId = await fetchImagesByListingId(supabase, rows);
  const listings = rows.map((row) =>
    listingRowToListing(row, imagesByListingId.get(row.id) ?? [], {
      includeRawSourceText: false,
    }),
  );

  return { listings: attachComplexes(listings, complexes), totalCount: count ?? 0 };
}

export interface ApartmentComplexOption {
  complexId: string;
  complexName: string;
  /** 현재 공개(published) 아파트 매물 건수. 0건인 단지는 애초에 이 목록에 없습니다. */
  count: number;
}

/**
 * Header의 "아파트" 드롭다운 전용. 하드코딩 없이, 지금 공개된 아파트 매물을
 * 실제로 세어서 단지별 건수를 만듭니다. 매물이 하나도 없는 단지는 자연히
 * 빠집니다(집계 대상 자체가 없으므로).
 */
export async function getApartmentComplexOptions(): Promise<ApartmentComplexOption[]> {
  const listings = await getAllListings({ filters: { propertyType: "아파트" } });

  const counts = new Map<string, ApartmentComplexOption>();
  for (const listing of listings) {
    const existing = counts.get(listing.complexId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(listing.complexId, {
        complexId: listing.complexId,
        complexName: listing.complex.name,
        count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.complexName.localeCompare(b.complexName),
  );
}

export async function getListingById(
  id: string,
  options: { includeDrafts?: boolean } = {},
): Promise<ListingWithComplex | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return undefined;
  }

  let query = supabase.from("listings").select("*").eq("id", id);
  if (!options.includeDrafts) {
    query = query.eq("status", "published").in("deal_status", [
      "advertising",
      "negotiating",
    ]);
  }

  const { data: row, error } = await query.maybeSingle();

  if (error) {
    console.error("[listings] 매물 조회 실패", error);
    return undefined;
  }
  if (!row) {
    return undefined;
  }

  const mappedListing = listingRowToListing(row, [], {
    includeRawSourceText: options.includeDrafts,
  });
  const complex = row.complex_id
    ? await getComplexById(row.complex_id)
    : mappedListing.propertyType === "상가"
      ? standaloneCommercialComplex(mappedListing)
      : undefined;
  if (!complex) {
    return undefined;
  }

  const imagesByListingId = await fetchImagesByListingId(supabase, [row]);
  const listing = listingRowToListing(
    row,
    imagesByListingId.get(row.id) ?? [],
    { includeRawSourceText: options.includeDrafts },
  );

  return { ...listing, complex };
}
