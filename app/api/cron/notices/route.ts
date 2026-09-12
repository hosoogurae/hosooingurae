import { NextRequest, NextResponse } from "next/server";
import { dedupeNoticesBySourceUrl, fetchAllNotices } from "../../../lib/noticeSources";
import { matchNoticeKeywords } from "../../../lib/noticeKeywords";
import { upsertNotices, type NoticeErrorDetail } from "../../../lib/notices";

/**
 * Vercel Cron 전용 실행 경로(매일 09:00 KST, vercel.json 참고). 이 경로는
 * proxy.ts의 matcher에 없어서 관리자 로그인 검사가 걸리지 않습니다 —
 * 그래서 이 라우트 스스로 CRON_SECRET을 검사해서 막습니다. Vercel이
 * 예약 실행 시 Authorization: Bearer <CRON_SECRET> 헤더를 붙여 호출합니다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/notices] CRON_SECRET 환경변수가 설정되어 있지 않습니다.");
    return NextResponse.json(
      { error: "CRON_SECRET이 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const results = await fetchAllNotices();

  // 한쪽 출처가 실패해도 다른 쪽 저장은 계속 진행합니다. 파싱 단계에서
  // 이미 "0건 = error"로 취급하므로(app/lib/noticeSources.ts), 여기서는
  // 그 결과를 그대로 드러내기만 하면 됩니다 — 조용히 삼키지 않습니다.
  const summary: Record<
    string,
    {
      fetched: number;
      filtered: number;
      inserted: number;
      error?: string;
      errorDetail?: NoticeErrorDetail;
    }
  > = {};

  for (const result of results) {
    if (result.error) {
      console.error(`[cron/notices] ${result.source} 수집 실패:`, result.error);
      summary[result.source] = { fetched: 0, filtered: 0, inserted: 0, error: result.error };
      continue;
    }

    const fetched = result.notices.length;
    // 같은 기사가 카테고리만 다르게 여러 번 실릴 수 있어(국토부 RSS에서
    // 실제로 확인됨), 저장 전에 (source, source_url) 기준으로 먼저
    // 중복을 제거합니다 — 안 그러면 upsert 한 묶음 안의 중복 때문에
    // 그 묶음 전체가 실패합니다.
    const deduped = dedupeNoticesBySourceUrl(result.notices);
    // 제목 필터: 두 목록(app/lib/noticeKeywords.ts) 중 어디든 걸린 것만
    // 저장합니다. 필터링 건수를 응답에 남겨야 필터가 갑자기 너무 많이
    // 거르고 있는 날을 알아챌 수 있습니다.
    const matchedNotices = deduped
      .map((notice) => ({ notice, match: matchNoticeKeywords(notice.title) }))
      .filter((entry) => entry.match.matched);
    const filtered = fetched - matchedNotices.length;

    const {
      inserted,
      error: saveError,
      errorDetail: saveErrorDetail,
    } = await upsertNotices(
      matchedNotices.map(({ notice, match }) => ({
        source: notice.source,
        title: notice.title,
        sourceUrl: notice.sourceUrl,
        publishedAt: notice.publishedAt,
        customerCandidate: match.customerCandidate,
      })),
    );
    if (saveError) {
      // Supabase 원본 에러(code/message/details)를 그대로 로그에 남깁니다 —
      // "DB 저장에 실패했습니다"만으로는 원인을 알 수 없습니다.
      console.error(`[cron/notices] ${result.source} 저장 실패:`, saveError, saveErrorDetail);
    }
    summary[result.source] = {
      fetched,
      filtered,
      inserted,
      error: saveError,
      errorDetail: saveErrorDetail,
    };
  }

  const hasError = Object.values(summary).some((entry) => entry.error);

  return NextResponse.json({ ok: !hasError, results: summary }, { status: hasError ? 207 : 200 });
}
