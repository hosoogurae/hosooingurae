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
  /**
   * 무엇이 일치해서 후보로 떴는지(화면에 그대로 문구로 씀). 근거 없이
   * "동일 매물로 보입니다"만 보여주면 관리자가 판단할 수 없어서 추가했습니다.
   */
  matchedOn: string[];
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

/**
 * 공급·전용면적 후보 비교 오차(㎡). findMatchingUnitTypes(평면도 자동 매칭)와
 * 같은 기준입니다. 예전엔 0.5였는데, 같은 단지 안에서 타입마다 전용면적
 * 차이가 거의 없는 경우(예: 호수마을e편한세상2단지는 모든 타입이 84.63~84.97)
 * 전용면적 하나만 넓게 봐주면 사실상 아무 매물이나 후보로 걸려버립니다.
 */
const AREA_MATCH_TOLERANCE = 0.05;

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
 * 거래유형·층이 모두 같고 공급 *그리고* 전용면적이 둘 다 ±0.05㎡ 이내인
 * 기존 매물을 찾습니다(findMatchingUnitTypes와 같은 기준). 공급/전용 둘 중
 * 하나라도 없으면(0 또는 미상) 후보 검색 자체를 하지 않습니다 — 엉뚱한
 * 매물을 후보로 잘못 띄워 "기존 매물 업데이트"로 합쳐지면 원래 데이터가
 * 사라져 복구가 어렵지만, 진짜 중복을 못 잡아 매물이 두 건 생기는 쪽은
 * 나중에 정리할 수 있는 훨씬 가벼운 실패이기 때문입니다. 정확도가 편의보다
 * 우선입니다.
 *
 * 예전엔 공급 *또는* 전용면적 하나만 맞아도(OR, ±0.5㎡) 후보로 잡았는데,
 * 같은 단지 안에서 타입마다 전용면적이 거의 같은 단지(예: 호수마을e편한
 * 세상2단지, 모든 타입 84.63~84.97)에서는 공급면적이 1㎡ 가까이 달라도
 * (= 사실 다른 타입인데도) 전용면적만으로 후보가 잡히는 사고가 있었습니다.
 *
 * 가격은 이 흐름에서 가장 흔히 바뀌는 값이라(재확인 시점에 값이 달라졌을
 * 가능성이 높음) 후보 판정 기준에서 의도적으로 제외했습니다 — 화면에는
 * 그대로 보여주되 매칭 여부에는 영향을 주지 않습니다. 이 경로로 찾은
 * 후보는 절대 자동으로 "같은 매물"로 확정하지 않고, 반드시 관리자가
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
      return {
        matchType: "article-id",
        listing: await toDuplicateSummary(data),
        matchedOn: ["매물번호"],
      };
    }
  }

  if (
    !criteria.complexId ||
    !criteria.building ||
    criteria.floor <= 0 ||
    // 공급·전용면적 둘 다 확인되지 않으면 후보 검색 자체를 하지 않습니다.
    // 엉뚱한 매물을 후보로 잘못 띄우는 쪽이(업데이트 시 원래 데이터가
    // 사라짐) 진짜 중복을 놓치는 쪽보다(매물 두 건, 나중에 정리 가능)
    // 훨씬 되돌리기 어려워서 정확도를 우선합니다.
    criteria.supplyArea <= 0 ||
    criteria.exclusiveArea <= 0
  ) {
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
  // 공급 *그리고* 전용면적 둘 다 맞아야 후보입니다(AND). 전용면적만 같아도
  // 공급면적이 다르면 같은 단지 안의 다른 타입일 수 있으므로 제외합니다.
  const candidate = data.find(
    (row) =>
      areaMatches(row.supply_area, criteria.supplyArea) &&
      areaMatches(row.exclusive_area, criteria.exclusiveArea),
  );
  if (!candidate) return undefined;

  return {
    matchType: "fallback",
    listing: await toDuplicateSummary(candidate),
    // AND 조건을 통과했다는 것 자체가 이 여섯 가지가 전부 일치했다는 뜻입니다.
    matchedOn: ["단지", "동", "거래유형", "층", "공급면적", "전용면적"],
  };
}
