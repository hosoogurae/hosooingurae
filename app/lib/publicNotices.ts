import { unstable_cache } from "next/cache";
import { getSupabaseClient } from "./supabase/client";

/**
 * 손님이 보는 /notices 전용 공개 조회입니다. app/lib/notices.ts(관리자
 * CRUD + 수집 크론)와는 완전히 분리합니다 — 그 파일은 전부 service_role
 * 키만 쓰기로 돼 있고, 이 파일은 정반대로 anon 키(getSupabaseClient)만
 * 써야 합니다. notices의 RLS 정책이 status='published'인 행만 공개
 * 읽기를 허용하므로, service_role을 쓰면 RLS를 우회해 "신규"/"숨김"
 * 글까지 그대로 새어나갑니다. 여기서도 .eq("status","published")를
 * 명시해 이중으로 막습니다.
 *
 * 반환 타입(PublicNotice)에는 id/status/customer_candidate 같은 내부
 * 표시를 아예 넣지 않습니다 — 화면 쪽 실수로도 보여줄 방법이 없게
 * 하기 위함입니다.
 */
export interface PublicNotice {
  source: "molit" | "gimpo";
  title: string;
  sourceUrl: string;
  publishedAt: string;
}

async function fetchPublishedNotices(): Promise<PublicNotice[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notices")
    .select("source, title, source_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error || !data) {
    console.error("[publicNotices] 조회 실패", error);
    return [];
  }

  return data.map((row) => ({
    source: row.source as "molit" | "gimpo",
    title: row.title,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
  }));
}

/**
 * 앱 전체가 app/layout.tsx에서 force-dynamic이라 페이지 단위
 * `export const revalidate`는 효과가 없습니다(한 라우트 트리 안에서
 * 가장 동적인 설정이 라우트 전체를 지배 — Next.js 문서로 확인함). 그래서
 * 페이지가 아니라 이 데이터 조회 함수 자체를 unstable_cache로
 * 시간 캐싱합니다.
 *
 * 5분: 소식은 하루 한 번만 바뀌어 매 요청마다 DB를 읽을 필요는 없지만,
 * 관리자가 "공개로 전환"을 눌렀을 때 5분보다 오래 기다리게 하고 싶지
 * 않습니다(관리자 화면에도 이 지연을 안내해뒀습니다).
 */
export const getPublishedNotices = unstable_cache(
  fetchPublishedNotices,
  ["public-notices"],
  { revalidate: 300 },
);
