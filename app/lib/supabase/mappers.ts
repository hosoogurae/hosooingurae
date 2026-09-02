import type { Complex } from "../../data/complexes";
import type { Customer, CustomerInput } from "../../data/customers";
import type {
  Consultation,
  ConsultationExtractedField,
  ConsultationTask,
  ConsultationTranscriptEntry,
} from "../../data/consultations";
import type {
  DealStatus,
  Listing,
  ListingStatus,
  PropertyType,
  TransactionType,
} from "../../data/listings";
import type {
  ComplexInsert,
  ComplexRow,
  ConsultationExtractedFieldRow,
  ConsultationInsert,
  ConsultationRow,
  ConsultationTaskRow,
  ConsultationTranscriptRow,
  CustomerInsert,
  CustomerRow,
  ListingImageInsert,
  ListingInsert,
  ListingRow,
} from "./database.types";
import { normalizePhone } from "../phoneNormalize";

/** DB row(snake_case) → 앱에서 쓰는 Complex 타입(camelCase). */
export function complexRowToComplex(row: ComplexRow): Complex {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    propertyType: (row.property_type as PropertyType | null) ?? undefined,
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
    managementOfficePhone: row.management_office_phone ?? undefined,
    managementFeeWon: row.management_fee_won ?? undefined,
    managementFeeRaw: row.management_fee_raw ?? undefined,
    managementFeeAsOf: row.management_fee_as_of ?? undefined,
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
    management_office_phone: complex.managementOfficePhone ?? null,
    management_fee_won: complex.managementFeeWon ?? null,
    management_fee_raw: complex.managementFeeRaw ?? null,
    management_fee_as_of: complex.managementFeeAsOf ?? null,
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
    complexId: row.complex_id ?? "",
    propertyType: row.property_type as PropertyType,
    status: row.status as ListingStatus,
    dealStatus: row.deal_status as DealStatus,
    lastVerifiedAt: row.last_verified_at ?? undefined,
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
    hasLoan: row.has_loan,
    loanAmount: row.loan_amount,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    suspectedMatchAcknowledgedAt: row.suspected_match_acknowledged_at ?? undefined,
  };
}

/** 앱의 Listing → Supabase insert/upsert 페이로드(listings 테이블 부분). */
export function listingToInsert(listing: Listing): ListingInsert {
  return {
    id: listing.id,
    complex_id: listing.complexId || null,
    property_type: listing.propertyType,
    status: listing.status,
    deal_status: listing.dealStatus,
    last_verified_at: listing.lastVerifiedAt ?? null,
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
    has_loan: listing.hasLoan,
    loan_amount: listing.loanAmount,
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
    suspected_match_acknowledged_at: listing.suspectedMatchAcknowledgedAt ?? null,
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

export function customerRowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    memo: row.memo ?? undefined,
    desiredTransactionType: row.desired_transaction_type ?? undefined,
    desiredArea: row.desired_area ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * phone_normalized는 phone에서 파생된 값이라 호출하는 쪽이 따로 넘기지
 * 않고 여기서 직접 계산합니다 — 화면 표시(phone)와 중복 비교
 * (phone_normalized)가 항상 같은 규칙으로 어긋나지 않게 하기 위함입니다.
 * 전화번호가 없으면(undefined/빈 문자열) 둘 다 null로 저장해 중복 검사
 * 대상에서 자연히 빠집니다.
 */
export function customerInputToInsert(input: CustomerInput): CustomerInsert {
  const phone = input.phone?.trim() || null;
  return {
    name: input.name,
    phone,
    phone_normalized: phone ? normalizePhone(phone) || null : null,
    memo: input.memo ?? null,
    desired_transaction_type: input.desiredTransactionType ?? null,
    desired_area: input.desiredArea ?? null,
  };
}

export function consultationRowToConsultation(row: ConsultationRow): Consultation {
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    mode: row.mode,
    status: row.status,
    transcript: row.transcript ?? undefined,
    correctedTranscript: row.corrected_transcript ?? undefined,
    summary: row.summary ?? undefined,
    extractedConditions: (row.extracted_conditions as Consultation["extractedConditions"]) ?? {},
    uncertainFields: row.uncertain_fields ?? [],
    followUpTasks: row.follow_up_tasks ?? [],
    smsDraft: row.sms_draft ?? undefined,
    internalMemo: row.internal_memo ?? undefined,
    tags: row.tags ?? [],
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** consultations 테이블 update 페이로드(부분 갱신 — PATCH 핸들러가 필요한 키만 채워 넘깁니다). */
export function consultationUpdateToRowPatch(
  patch: Partial<Consultation>,
): Partial<ConsultationInsert> {
  const row: Partial<ConsultationInsert> = {};
  if (patch.customerId !== undefined) row.customer_id = patch.customerId ?? null;
  if (patch.endedAt !== undefined) row.ended_at = patch.endedAt ?? null;
  if (patch.durationSeconds !== undefined) row.duration_seconds = patch.durationSeconds ?? null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.transcript !== undefined) row.transcript = patch.transcript ?? null;
  if (patch.correctedTranscript !== undefined) {
    row.corrected_transcript = patch.correctedTranscript ?? null;
  }
  if (patch.summary !== undefined) row.summary = patch.summary ?? null;
  if (patch.extractedConditions !== undefined) {
    row.extracted_conditions = patch.extractedConditions;
  }
  if (patch.uncertainFields !== undefined) row.uncertain_fields = patch.uncertainFields;
  if (patch.followUpTasks !== undefined) row.follow_up_tasks = patch.followUpTasks;
  if (patch.smsDraft !== undefined) row.sms_draft = patch.smsDraft ?? null;
  if (patch.internalMemo !== undefined) row.internal_memo = patch.internalMemo ?? null;
  if (patch.tags !== undefined) row.tags = patch.tags;
  return row;
}

export function transcriptRowToEntry(
  row: ConsultationTranscriptRow,
): ConsultationTranscriptEntry {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    speaker: row.speaker,
    text: row.text,
    correctedText: row.corrected_text ?? undefined,
    sortOrder: row.sort_order,
    finalizedAt: row.finalized_at,
  };
}

export function extractedFieldRowToField(
  row: ConsultationExtractedFieldRow,
): ConsultationExtractedField {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    fieldKey: row.field_key,
    fieldValue: row.field_value,
    confidence: row.confidence,
    updatedAt: row.updated_at,
  };
}

export function taskRowToTask(row: ConsultationTaskRow): ConsultationTask {
  return {
    id: row.id,
    consultationId: row.consultation_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    taskType: row.task_type,
    description: row.description,
    dueDate: row.due_date ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
