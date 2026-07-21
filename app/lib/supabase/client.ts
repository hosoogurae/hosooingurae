import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cachedClient: SupabaseClient<Database> | null | undefined;
let cachedAdminClient: SupabaseClient<Database> | null | undefined;

/**
 * 공개 읽기용 Supabase 클라이언트(publishable/anon key, RLS 적용).
 *
 * Supabase는 최근 API 키 명칭을 anon → publishable, service_role → secret으로
 * 정리했습니다. 두 이름 모두 지원하되 새 이름(publishable)을 우선합니다.
 *
 * 환경변수가 설정되어 있지 않으면 null을 반환합니다. 호출부(app/lib/complexes.ts,
 * app/lib/listings.ts)는 null인 경우 빈 배열 등으로 우아하게 대체해야 합니다.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    console.warn(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 " +
        "설정되지 않았습니다. .env.local을 확인해주세요.",
    );
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

/**
 * 관리자 전용 Supabase 클라이언트(secret/service role key, RLS 우회).
 *
 * secret key는 절대 브라우저로 노출되면 안 되므로 Route Handler 같은
 * 서버 코드에서만 호출하세요. 브라우저에서 호출되면 에러를 던집니다.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabaseAdminClient는 서버에서만 사용할 수 있습니다 (secret key 노출 방지).",
    );
  }

  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    console.warn(
      "[supabase] SUPABASE_SECRET_KEY가 설정되지 않았습니다. " +
        "관리자 등록/수정/삭제 기능을 사용할 수 없습니다.",
    );
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createClient<Database>(url, secretKey, {
    auth: { persistSession: false },
  });
  return cachedAdminClient;
}
