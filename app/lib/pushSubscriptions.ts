import type {
  PushSubscriptionInput,
  StoredPushSubscription,
} from "../data/pushSubscriptions";
import { getSupabaseAdminClient } from "./supabase/client";
import type { PushSubscriptionRow } from "./supabase/database.types";

/**
 * push_subscriptions는 기기별 구독 정보가 담긴 테이블이라 공개 select/insert
 * 정책이 없습니다(contact_requests와 동일한 설계). 구독 등록/해제/발송 전부
 * 서버 Route Handler를 거쳐 이 함수들로 들어옵니다.
 */

function rowToStoredSubscription(row: PushSubscriptionRow): StoredPushSubscription {
  return {
    id: row.id,
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
    createdAt: row.created_at,
  };
}

/** 관리자 알림 토글을 켤 때 호출합니다. 같은 기기(endpoint)가 껐다 켜면
 * 충돌 없이 갱신되도록 upsert로 처리합니다. */
export async function saveSubscription(
  input: PushSubscriptionInput,
  userAgent?: string,
): Promise<{ subscription?: StoredPushSubscription; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        user_agent: userAgent ?? null,
      },
      { onConflict: "endpoint" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[pushSubscriptions] 저장 실패", error);
    return { error: "구독 저장에 실패했습니다." };
  }

  return { subscription: rowToStoredSubscription(data) };
}

/** 관리자 알림 토글을 끌 때 호출합니다. */
export async function deleteSubscriptionByEndpoint(
  endpoint: string,
): Promise<{ error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[pushSubscriptions] 삭제 실패", error);
    return { error: "구독 해제에 실패했습니다." };
  }

  return {};
}

/** 새 문의 발생 시 발송 대상 전체를 가져올 때 사용합니다. */
export async function getAllSubscriptions(): Promise<StoredPushSubscription[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("push_subscriptions").select("*");

  if (error || !data) {
    console.error("[pushSubscriptions] 목록 조회 실패", error);
    return [];
  }

  return data.map(rowToStoredSubscription);
}

/** "테스트 알림 보내기" 버튼이 현재 기기 하나만 조회할 때 사용합니다. */
export async function getSubscriptionByEndpoint(
  endpoint: string,
): Promise<StoredPushSubscription | undefined> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[pushSubscriptions] 단건 조회 실패", error);
    return undefined;
  }

  return rowToStoredSubscription(data);
}
