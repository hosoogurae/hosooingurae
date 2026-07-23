import type { Complex } from "../../data/complexes";
import type {
  Listing,
  ListingStatus,
  PropertyType,
  TransactionType,
} from "../../data/listings";
import type {
  ComplexInsert,
  ComplexRow,
  ListingImageInsert,
  ListingInsert,
  ListingRow,
} from "./database.types";

/** DB row(snake_case) → 앱에서 쓰는 Complex 타입(camelCase). */
export function complexRowToComplex(row: ComplexRow): Complex {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    propertyType: row.property_type ?? undefined,
    approvalDate: row.approval_date ?? undefined,
    totalHouseholds: row.total_households ?? undefined,
    buildings: row.buildings ?? undefined,
    parkingCount: row.parking_count ?? undefined,
    parkingPerHousehold: row.parking_per_household ?? undefined,
    heating: row.heating ?? undefined,
    hallwayType: row.hallway_type ?? undefined,
    builder: row.builder ?? undefined,
    maxFloor: row.max_floor ?? undefined,
    floorAreaRatio: row.floor_area_ratio ?? undefined,
    buildingCoverageRatio: row.building_coverage_ratio ?? undefined,
    nearbySchools: row.nearby_schools,
    transportation: {
      subway: row.subway ?? undefined,
      subwayDistance: row.subway_distance ?? undefined,
      subwayWalkMinutes: row.subway_walk_minutes ?? undefined,
      buses: row.buses.length > 0 ? row.buses : undefined,
    },
    features: row.features,
    molit:
      row.molit_lawd_code && row.molit_apt_seq
        ? { lawdCode: row.molit_lawd_code, aptSeq: row.molit_apt_seq }
        : undefined,
  };
}

/** 앱의 Complex → Supabase insert/upsert 페이로드(마이그레이션 스크립트용). */
export function complexToInsert(complex: Complex): ComplexInsert {
  return {
    id: complex.id,
    name: complex.name,
    address: complex.address,
    property_type: complex.propertyType ?? null,
    approval_date: complex.approvalDate ?? null,
    total_households: complex.totalHouseholds ?? null,
    buildings: complex.buildings ?? null,
    parking_count: complex.parkingCount ?? null,
    parking_per_household: complex.parkingPerHousehold ?? null,
    heating: complex.heating ?? null,
    hallway_type: complex.hallwayType ?? null,
    builder: complex.builder ?? null,
    max_floor: complex.maxFloor ?? null,
    floor_area_ratio: complex.floorAreaRatio ?? null,
    building_coverage_ratio: complex.buildingCoverageRatio ?? null,
    nearby_schools: complex.nearbySchools,
    subway: complex.transportation.subway ?? null,
    subway_distance: complex.transportation.subwayDistance ?? null,
    subway_walk_minutes: complex.transportation.subwayWalkMinutes ?? null,
    buses: complex.transportation.buses ?? [],
    features: complex.features,
    molit_lawd_code: complex.molit?.lawdCode ?? null,
    molit_apt_seq: complex.molit?.aptSeq ?? null,
  };
}

/**
 * DB row(snake_case) + 이미지 URL 목록 → 앱에서 쓰는 Listing 타입(camelCase).
 *
 * includeRawSourceText가 true일 때만 rawSourceText를 채웁니다. 원문 붙여넣기
 * 텍스트는 관리자 화면에서만 노출해야 하므로(공개 API·홈페이지에는 절대 포함 금지),
 * 공개 조회 경로에서는 반드시 false(기본값)로 호출하세요.
 */
export function listingRowToListing(
  row: ListingRow,
  images: string[],
  options: { includeRawSourceText?: boolean } = {},
): Listing {
  return {
    id: row.id,
    complexId: row.complex_id,
    propertyType: row.property_type as PropertyType,
    status: row.status as ListingStatus,
    transactionType: row.transaction_type as TransactionType,
    price: row.price,
    priceLabel: row.price_label,
    building: row.building,
    floor: row.floor,
    totalFloors: row.total_floors,
    supplyArea: row.supply_area,
    exclusiveArea: row.exclusive_area,
    roomCount: row.room_count,
    bathroomCount: row.bathroom_count,
    direction: row.direction,
    moveInDate: row.move_in_date,
    maintenanceFee: row.maintenance_fee ?? undefined,
    shortDescription: row.short_description,
    features: row.features,
    unitType: row.unit_type ?? undefined,
    image: images[0],
    images: images.length > 0 ? images : undefined,
    naverUrl: row.naver_url ?? undefined,
    articleNumber: row.article_number ?? undefined,
    verifiedDate: row.verified_date ?? undefined,
    isFeatured: row.is_featured,
    sourceType: row.source_type ?? undefined,
    sourceArticleId: row.source_article_id ?? undefined,
    rawSourceText: options.includeRawSourceText
      ? row.raw_source_text ?? undefined
      : undefined,
  };
}

/** 앱의 Listing → Supabase insert/upsert 페이로드(listings 테이블 부분). */
export function listingToInsert(listing: Listing): ListingInsert {
  return {
    id: listing.id,
    complex_id: listing.complexId,
    property_type: listing.propertyType,
    status: listing.status,
    transaction_type: listing.transactionType,
    price: listing.price,
    price_label: listing.priceLabel,
    building: listing.building,
    floor: listing.floor,
    total_floors: listing.totalFloors,
    supply_area: listing.supplyArea,
    exclusive_area: listing.exclusiveArea,
    room_count: listing.roomCount,
    bathroom_count: listing.bathroomCount,
    direction: listing.direction,
    move_in_date: listing.moveInDate,
    maintenance_fee: listing.maintenanceFee ?? null,
    short_description: listing.shortDescription,
    features: listing.features,
    naver_url: listing.naverUrl ?? null,
    article_number: listing.articleNumber ?? null,
    verified_date: listing.verifiedDate ?? null,
    is_featured: listing.isFeatured,
    source_type: listing.sourceType ?? null,
    source_article_id: listing.sourceArticleId ?? null,
    raw_source_text: listing.rawSourceText ?? null,
    unit_type: listing.unitType ?? null,
  };
}

/** 앱의 Listing.images → listing_images insert 페이로드 배열. */
export function listingToImageInserts(listing: Listing): ListingImageInsert[] {
  const images = listing.images ?? (listing.image ? [listing.image] : []);
  return images.map((url, index) => ({
    listing_id: listing.id,
    url,
    sort_order: index,
  }));
}
