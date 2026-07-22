import type { Complex } from "../data/complexes";
import type { Listing } from "../data/listings";
import { getAllComplexes, getComplexById } from "./complexes";
import type { ListingSearchFilters } from "./listingFilters";
import { getSupabaseClient } from "./supabase/client";
import type { ListingRow } from "./supabase/database.types";
import { listingRowToListing } from "./supabase/mappers";

export interface ListingWithComplex extends Listing {
  complex: Complex;
}

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
  } = {},
): Promise<ListingWithComplex[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (!options.includeDrafts) {
    query = query.eq("status", "published");
  }

  const filters = options.filters;
  if (filters?.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters?.transactionType) {
    query = query.eq("transaction_type", filters.transactionType);
  }
  if (filters?.featured) {
    query = query.eq("is_featured", true);
  }
  if (filters?.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters?.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  const [{ data: rows, error }, complexes] = await Promise.all([
    query,
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

export async function getFeaturedListings(): Promise<ListingWithComplex[]> {
  const all = await getAllListings();
  return all.filter((listing) => listing.isFeatured);
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
    query = query.eq("status", "published");
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
