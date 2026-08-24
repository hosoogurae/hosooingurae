import type { ContactRequest, ContactRequestInput } from "../data/contactRequests";
import { getSupabaseAdminClient } from "./supabase/client";
import type { ContactRequestRow } from "./supabase/database.types";

/**
 * contact_requests는 연락처 PII가 담긴 테이블이라 공개 select/insert 정책이
 * 없습니다(listing_submissions와 동일한 설계). 그래서 이 함수는 service_role
 * 클라이언트만 씁니다 — 공개 제출(매물 상세 "연락받기")도 서버 Route
 * Handler를 거쳐 이 함수로 들어옵니다.
 */

function rowToContactRequest(row: ContactRequestRow): ContactRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    name: row.name,
    phone: row.phone,
    preferredTime: row.preferred_time ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** 공개 "연락받기" 폼(매물 상세페이지)에서 호출합니다. */
export async function createContactRequest(
  input: ContactRequestInput,
): Promise<{ contactRequest?: ContactRequest; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("contact_requests")
    .insert({
      listing_id: input.listingId,
      name: input.name,
      phone: input.phone,
      preferred_time: input.preferredTime?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[contactRequests] 저장 실패", error);
    return { error: "저장에 실패했습니다." };
  }

  return { contactRequest: rowToContactRequest(data) };
}
