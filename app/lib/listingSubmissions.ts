import type {
  ListingSubmission,
  ListingSubmissionInput,
  ListingSubmissionStatus,
} from "../data/listingSubmissions";
import { getSupabaseAdminClient } from "./supabase/client";
import type { ListingSubmissionRow } from "./supabase/database.types";

/**
 * listing_submissions는 접수 단계에서만 쓰는 테이블이라 공개 select 정책이
 * 없습니다(연락처 PII 보호). 그래서 모든 함수가 service_role 클라이언트만
 * 씁니다 — 공개 제출(app/sell)도 서버 Route Handler를 거쳐 이 함수로 들어옵니다.
 */

function rowToListingSubmission(row: ListingSubmissionRow): ListingSubmission {
  return {
    id: row.id,
    complexName: row.complex_name,
    building: row.building ?? undefined,
    floor: row.floor ?? undefined,
    transactionType: row.transaction_type,
    desiredPriceLabel: row.desired_price_label,
    occupancyStatus: row.occupancy_status ?? undefined,
    interiorCondition: row.interior_condition ?? undefined,
    moveOutDate: row.move_out_date ?? undefined,
    viewingAvailability: row.viewing_availability ?? undefined,
    notes: row.notes ?? undefined,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    status: row.status,
    convertedListingId: row.converted_listing_id ?? undefined,
    createdAt: row.created_at,
  };
}

/** 공개 제출 폼(app/sell)에서 호출합니다. */
export async function createListingSubmission(
  input: ListingSubmissionInput,
): Promise<{ submission?: ListingSubmission; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("listing_submissions")
    .insert({
      complex_name: input.complexName,
      building: input.building?.trim() || null,
      floor: input.floor ?? null,
      transaction_type: input.transactionType,
      desired_price_label: input.desiredPriceLabel,
      occupancy_status: input.occupancyStatus?.trim() || null,
      interior_condition: input.interiorCondition?.trim() || null,
      move_out_date: input.moveOutDate?.trim() || null,
      viewing_availability: input.viewingAvailability?.trim() || null,
      notes: input.notes?.trim() || null,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[listingSubmissions] 접수 저장 실패", error);
    return { error: "접수 저장에 실패했습니다." };
  }

  return { submission: rowToListingSubmission(data) };
}

/** 관리자 화면(/admin/listing-submissions) 전용. 신규 건이 먼저 보이도록 정렬합니다. */
export async function getAllListingSubmissions(): Promise<ListingSubmission[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listing_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[listingSubmissions] 목록 조회 실패", error);
    return [];
  }

  // 신규 건이 가장 먼저 보이도록 정렬합니다(같은 상태끼리는 최신순 유지).
  const statusPriority: Record<string, number> = {
    new: 0,
    confirmed: 1,
    converted: 2,
  };
  const sorted = [...data].sort(
    (a, b) => statusPriority[a.status] - statusPriority[b.status],
  );

  return sorted.map(rowToListingSubmission);
}

export async function updateListingSubmissionStatus(
  id: string,
  status: ListingSubmissionStatus,
): Promise<{ submission?: ListingSubmission; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("listing_submissions")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[listingSubmissions] 상태 변경 실패", error);
    return { error: "상태 변경에 실패했습니다." };
  }
  if (!data) {
    return { error: "접수 건을 찾을 수 없습니다." };
  }

  return { submission: rowToListingSubmission(data) };
}

export async function deleteListingSubmission(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { error } = await supabase
    .from("listing_submissions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[listingSubmissions] 삭제 실패", error);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  return { success: true };
}
