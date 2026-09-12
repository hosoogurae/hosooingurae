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
  /** 제목 필터(app/lib/noticeKeywords.ts)가 손님 관련 단어에 걸렸는지. */
  customerCandidate: boolean;
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
    customerCandidate: row.customer_candidate,
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
 * 수집 크론 전용. (source, source_url) 유일 제약에 걸리는 행은 새로
 * 쌓이지 않고 갱신됩니다 — 단, title/published_at/customer_candidate만
 * 갱신 대상입니다. status(신규/공개/숨김, 사람이 정한 값)는 이 upsert가
 * 건드리는 컬럼 목록에 아예 없어서 절대 덮어쓰이지 않습니다.
 *
 * customer_candidate를 이미 있는 행도 최신 판정으로 갱신하는 이유:
 * 나중에 app/lib/noticeKeywords.ts의 단어 목록을 손보고 다시 수집했을 때,
 * 예전에 들어온 글의 "손님용 후보" 표시가 옛날 판정 그대로 남아있으면
 * 안 되기 때문입니다.
 *
 * "몇 건이 새로 들어왔는지"는 크론 결과에서 중요한 신호라서(필터가 갑자기
 * 너무 많이 거르고 있는지 등을 알아채는 용도), upsert 전에 이미 있는
 * source_url을 먼저 조회해 진짜 신규 건수만 따로 셉니다.
 */
export async function upsertNotices(
  notices: Array<{
    source: NoticeSource;
    title: string;
    sourceUrl: string;
    publishedAt: string;
    customerCandidate: boolean;
  }>,
): Promise<{ inserted: number; error?: string }> {
  if (notices.length === 0) return { inserted: 0 };

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { inserted: 0, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const sourceUrls = [...new Set(notices.map((notice) => notice.sourceUrl))];
  const { data: existingRows, error: existingError } = await supabase
    .from("notices")
    .select("source_url")
    .in("source_url", sourceUrls);

  if (existingError) {
    console.error("[notices] 기존 항목 조회 실패", existingError);
    return { inserted: 0, error: "DB 조회에 실패했습니다." };
  }

  const existingUrls = new Set((existingRows ?? []).map((row) => row.source_url));
  const newCount = notices.filter((notice) => !existingUrls.has(notice.sourceUrl)).length;

  const { error } = await supabase.from("notices").upsert(
    notices.map((notice) => ({
      source: notice.source,
      title: notice.title,
      source_url: notice.sourceUrl,
      published_at: notice.publishedAt,
      customer_candidate: notice.customerCandidate,
    })),
    { onConflict: "source,source_url" },
  );

  if (error) {
    console.error("[notices] 저장 실패", error);
    return { inserted: 0, error: "DB 저장에 실패했습니다." };
  }
  return { inserted: newCount };
}
