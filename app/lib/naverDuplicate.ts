import type { ListingStatus, TransactionType } from "../data/listings";
import { getComplexById } from "./complexes";
import type { getSupabaseClient } from "./supabase/client";

export interface DuplicateListingSummary {
  id: string;
  complexName: string;
  building: string;
  transactionType: TransactionType;
  priceLabel: string;
  supplyArea: number;
  exclusiveArea: number;
  floor: number;
  totalFloors: number;
  status: ListingStatus;
  lastVerifiedAt?: string;
  features: string[];
  shortDescription: string;
  /** 최초 등록일(created_at). */
  registeredAt: string;
  /** 최근 수정일(updated_at). */
  updatedAt: string;
  editUrl: string;
}

export interface DuplicateMatch {
  /** "article-id": 매물번호(URL 또는 텍스트) 완전 일치. "fallback": 단지/동/거래유형/면적/층 기반 후보. */
  matchType: "article-id" | "fallback";
  listing: DuplicateListingSummary;
}

export interface DuplicateCriteria {
  sourceArticleId?: string;
  articleNumber?: string;
  complexId: string;
  building: string;
  transactionType: TransactionType;
  supplyArea: number;
  exclusiveArea: number;
  floor: number;
}

/** 공급/전용면적 후보 비교 오차(㎡). 네이버 표기 반올림 오차를 흡수합니다. */
const AREA_MATCH_TOLERANCE = 0.5;

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>;

const SUMMARY_COLUMNS =
  "id, complex_id, building, transaction_type, price_label, supply_area, " +
  "exclusive_area, floor, total_floors, status, last_verified_at, features, " +
  "short_description, created_at, updated_at";

interface SummaryRow {
  id: string;
  complex_id: string;
  building: string;
  transaction_type: TransactionType;
  price_label: string;
  supply_area: number;
  exclusive_area: number;
  floor: number;
  total_floors: number;
  status: ListingStatus;
  last_verified_at: string | null;
  features: string[];
  short_description: string;
  created_at: string;
  updated_at: string;
}

async function toDuplicateSummary(row: SummaryRow): Promise<DuplicateListingSummary> {
  const complex = await getComplexById(row.complex_id);
  return {
    id: row.id,
    complexName: complex?.name ?? "",
    building: row.building,
    transactionType: row.transaction_type,
    priceLabel: row.price_label,
    supplyArea: row.supply_area,
    exclusiveArea: row.exclusive_area,
    floor: row.floor,
    totalFloors: row.total_floors,
    status: row.status,
    lastVerifiedAt: row.last_verified_at ?? undefined,
    features: row.features,
    shortDescription: row.short_description,
    registeredAt: row.created_at,
    updatedAt: row.updated_at,
    editUrl: `/admin/listings/${row.id}/edit`,
  };
}

/**
 * 네이버 매물을 (재)가져올 때 이미 등록된 매물이 있는지 확인합니다.
 *
 * 1순위(정확 일치): source_article_id(URL의 articleNo)와 article_number
 * (텍스트에서 새로 추출한 매물번호)를 같은 식별 개념으로 취급해, 둘 중
 * 하나라도 기존 매물의 두 컬럼 중 하나와 일치하면 즉시 반환합니다.
 *
 * 2순위(후보, 자동 확정 금지): 매물번호를 전혀 못 구했을 때만, 단지·동·
 * 거래유형·층이 모두 같고 공급 또는 전용면적이 ±0.5㎡ 이내인 기존 매물을
 * 찾습니다. 가격은 이 흐름에서 가장 흔히 바뀌는 값이라(재확인 시점에 값이
 * 달라졌을 가능성이 높음) 후보 판정 기준에서 의도적으로 제외했습니다 —
 * 화면에는 그대로 보여주되 매칭 여부에는 영향을 주지 않습니다. 이 경로로
 * 찾은 후보는 절대 자동으로 "같은 매물"로 확정하지 않고, 반드시 관리자가
 * 화면에서 확인 후 선택하게 합니다(호출하는 쪽의 책임).
 */
export async function findNaverDuplicate(
  supabase: SupabaseClient,
  criteria: DuplicateCriteria,
): Promise<DuplicateMatch | undefined> {
  const idCandidates = [criteria.sourceArticleId, criteria.articleNumber].filter(
    (value): value is string => Boolean(value),
  );

  if (idCandidates.length > 0) {
    const orParts = idCandidates.flatMap((value) => [
      `source_article_id.eq.${value}`,
      `article_number.eq.${value}`,
    ]);
    const { data, error } = await supabase
      .from("listings")
      .select<string, SummaryRow>(SUMMARY_COLUMNS)
      .or(orParts.join(","))
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[naverDuplicate] 매물번호 기준 중복 확인 실패", error);
    } else if (data) {
      return { matchType: "article-id", listing: await toDuplicateSummary(data) };
    }
  }

  if (!criteria.complexId || !criteria.building || criteria.floor <= 0) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("listings")
    .select<string, SummaryRow>(SUMMARY_COLUMNS)
    .eq("complex_id", criteria.complexId)
    .eq("building", criteria.building)
    .eq("transaction_type", criteria.transactionType)
    .eq("floor", criteria.floor);

  if (error) {
    console.error("[naverDuplicate] 후보 매물 조회 실패", error);
    return undefined;
  }
  if (!data || data.length === 0) return undefined;

  const areaMatches = (a: number, b: number) => Math.abs(a - b) <= AREA_MATCH_TOLERANCE;
  const candidate = data.find(
    (row) =>
      (criteria.supplyArea > 0 && areaMatches(row.supply_area, criteria.supplyArea)) ||
      (criteria.exclusiveArea > 0 && areaMatches(row.exclusive_area, criteria.exclusiveArea)),
  );
  if (!candidate) return undefined;

  return { matchType: "fallback", listing: await toDuplicateSummary(candidate) };
}
