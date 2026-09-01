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
 * listings 테이블의 모든 컬럼 중 raw_source_text(네이버 원문 스크랩 텍스트,
 * 관리자 전용)만 뺀 목록. 공개 조회(getAllListings의 includeDrafts=false
 * 경로)는 이 컬럼을 절대 쓰지 않으므로 select 단계에서부터 가져오지
 * 않습니다. listingRowToListing이 이 컬럼 외의 모든 필드를 무조건 읽으므로,
 * 여기서 더 줄이면 다른 화면(recommend/compare 등)이 조용히 깨질 수 있어
 * 이 필드 하나만 제외합니다.
 */
const PUBLIC_LISTING_COLUMNS =
  "id, complex_id, property_type, status, deal_status, last_verified_at, " +
  "transaction_type, price, price_label, building, floor, total_floors, " +
  "supply_area, exclusive_area, room_count, bathroom_count, direction, " +
  "move_in_date, maintenance_fee, has_loan, loan_amount, short_description, " +
  "features, naver_url, article_number, verified_date, is_featured, " +
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
 * 검색어(단지명·동·매물번호)에 매칭되는 매물 id 목록을 DB 쿼리로 찾습니다.
 * 세 조건을 각각 별도의 안전한(파라미터화된) 쿼리로 찾은 뒤 합칩니다 —
 * PostgREST .or() 문자열에 사용자 입력을 그대로 끼워 넣으면 쉼표/괄호로
 * 필터 구문 자체가 깨지거나 의도치 않은 조건이 섞일 위험이 있어 피합니다.
 */
async function resolveSearchListingIds(
  supabase: SupabaseClient,
  query: string,
): Promise<string[]> {
  // %, _는 ilike 와일드카드라서 검색어에 그대로 있으면 리터럴로 이스케이프합니다.
  const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;

  const [complexMatches, buildingMatches, idMatches] = await Promise.all([
    supabase.from("complexes").select("id").ilike("name", pattern),
    supabase.from("listings").select("id").ilike("building", pattern),
    supabase.from("listings").select("id").ilike("id", pattern),
  ]);

  const matchedComplexIds = (complexMatches.data ?? []).map((row) => row.id);
  const byComplexName = matchedComplexIds.length > 0
    ? await supabase.from("listings").select("id").in("complex_id", matchedComplexIds)
    : { data: [] as { id: string }[] };

  const ids = new Set<string>();
  for (const row of byComplexName.data ?? []) ids.add(row.id);
  for (const row of buildingMatches.data ?? []) ids.add(row.id);
  for (const row of idMatches.data ?? []) ids.add(row.id);

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
    }
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

  // 검색어가 있는데 매칭되는 매물이 하나도 없으면, 메인 쿼리를 보낼 필요 없이
  // 바로 빈 배열을 돌려줍니다.
  let searchMatchedIds: string[] | null = null;
  if (filters?.search && filters.search.trim() !== "") {
    searchMatchedIds = await resolveSearchListingIds(supabase, filters.search.trim());
    if (searchMatchedIds.length === 0) {
      return [];
    }
  }

  const { column, ascending, nullsFirst } = getListingSortColumn(
    options.sort ?? DEFAULT_LISTING_SORT,
  );
  let query = supabase
    .from("listings")
    .select(options.includeDrafts ? "*" : PUBLIC_LISTING_COLUMNS)
    .order(column, { ascending, nullsFirst });

  if (!options.includeDrafts) {
    // completed/hold는 status(공개 여부)와 무관하게 항상 공개 조회에서 제외 —
    // 관리자가 status를 따로 안 바꿔도 계약완료/보류 매물이 계속 광고되는
    // 사고를 막기 위함(app/data/listings.ts의 DealStatus 주석 참고).
    query = query.eq("status", "published").in("deal_status", [
      "advertising",
      "negotiating",
    ]);
  }

  if (filters?.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters?.transactionType) {
    query = query.eq("transaction_type", filters.transactionType);
  }
  if (filters?.featured) {
    query = query.eq("is_featured", true);
  }
  if (filters?.complexId) {
    query = query.eq("complex_id", filters.complexId);
  }
  if (filters?.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters?.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }
  // 관리자 전용(공개/비공개 필터) — includeDrafts로 draft를 보이게 한 뒤,
  // 이 필터로 공개중/비공개 중 하나만 더 좁힙니다.
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (searchMatchedIds) {
    query = query.in("id", searchMatchedIds);
  }
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

  const complex = await getComplexById(row.complex_id);
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

export async function getListingsByComplexId(
  complexId: string,
): Promise<ListingWithComplex[]> {
  const all = await getAllListings();
  return all.filter((listing) => listing.complexId === complexId);
}
