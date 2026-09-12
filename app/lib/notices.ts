import { getSupabaseAdminClient } from "./supabase/client";
import type { NoticeRow } from "./supabase/database.types";
import type { NoticeSource } from "./noticeSources";

/**
 * "지역 소식" 관리자 CRUD + 수집 크론 전용.
 *
 * 이 파일은 모든 함수가 반드시 getSupabaseAdminClient()(service_role)만
 * 씁니다 — getSupabaseClient()(공개 anon 키)를 쓰면 절대 안 됩니다.
 * notices의 RLS 정책은 status='published'인 행만 공개 읽기를 허용하는데,
 * 관리자가 이 화면에서 봐야 하는 건 정확히 그 반대인 "신규(new)" 상태
 * 글입니다. anon 키로 조회하면 목록이 늘 비어 보이고, RLS가 제대로
 * 작동하는 것뿐인데도 "수집이 안 되고 있다"고 오해하기 딱 좋습니다.
 * 수집 크론의 upsert도 새 글은 status='new'로 들어가므로 같은 이유로
 * service_role이 필요합니다.
 */

export type NoticeStatus = "new" | "published" | "hidden";

export interface Notice {
  id: string;
  source: NoticeSource;
  title: string;
  sourceUrl: string;
  publishedAt: string;
  status: NoticeStatus;
  createdAt: string;
}

function rowToNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    source: row.source as NoticeSource,
    title: row.title,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    status: row.status as NoticeStatus,
    createdAt: row.created_at,
  };
}

/** 관리자 목록 조회 — 상태 무관 전체(신규 포함), 게시일 최신순. */
export async function getAllNotices(filters?: {
  source?: NoticeSource;
  status?: NoticeStatus;
}): Promise<Notice[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase.from("notices").select("*").order("published_at", { ascending: false });
  if (filters?.source) query = query.eq("source", filters.source);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error || !data) {
    console.error("[notices] 목록 조회 실패", error);
    return [];
  }
  return data.map(rowToNotice);
}

export async function updateNoticeStatus(
  id: string,
  status: NoticeStatus,
): Promise<{ notice?: Notice; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("notices")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[notices] 상태 변경 실패", error);
    return { error: "상태를 변경하지 못했습니다." };
  }
  if (!data) {
    return { error: "글을 찾을 수 없습니다." };
  }
  return { notice: rowToNotice(data) };
}

/**
 * 수집 크론 전용. (source, source_url) 유일 제약에 걸리는 행은 조용히
 * 건너뜁니다(ignoreDuplicates) — 매일 돌아도 이미 있는 글이 중복으로
 * 쌓이거나, 관리자가 이미 공개/숨김으로 바꿔둔 상태가 되돌아가지
 * 않습니다.
 */
export async function upsertNotices(
  notices: Array<{ source: NoticeSource; title: string; sourceUrl: string; publishedAt: string }>,
): Promise<{ inserted: number; error?: string }> {
  if (notices.length === 0) return { inserted: 0 };

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { inserted: 0, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("notices")
    .upsert(
      notices.map((notice) => ({
        source: notice.source,
        title: notice.title,
        source_url: notice.sourceUrl,
        published_at: notice.publishedAt,
      })),
      { onConflict: "source,source_url", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    console.error("[notices] 저장 실패", error);
    return { inserted: 0, error: "DB 저장에 실패했습니다." };
  }
  return { inserted: data?.length ?? 0 };
}
