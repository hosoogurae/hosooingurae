import { NextRequest, NextResponse } from "next/server";
import {
  AUTO_HOLD_MAX_PER_RUN,
  findAutoHoldCandidates,
} from "../../../lib/listingAutoHold";
import { getAllListings } from "../../../lib/listings";
import { sendAutoHoldPush } from "../../../lib/push";
import { getSupabaseAdminClient } from "../../../lib/supabase/client";

/**
 * Vercel Cron 전용 실행 경로(매일 01:00 KST 근처, vercel.json 참고 — Hobby
 * 플랜이라 정확한 시각은 보장되지 않습니다). /api/cron/notices와 완전히
 * 분리된 별도 경로입니다 — 지역소식 수집과 매물 보류는 서로 다른 도메인이라
 * 한쪽이 실패해도 다른 쪽까지 같이 죽지 않게 하기 위함입니다. 이 경로는
 * proxy.ts의 matcher에 없어서 관리자 로그인 검사가 걸리지 않으므로, 이
 * 경로 스스로 CRON_SECRET을 검사해서 막습니다.
 *
 * ?dryRun=1로 호출하면 실제로는 아무것도 바꾸지 않고 "지금 조건에 걸리는
 * 매물이 무엇인지"만 돌려줍니다 — 배포 직후 날짜 계산이 맞는지 직접 눈으로
 * 확인하는 용도이며, 이때는 20건 상한과 무관하게 전체 후보를 보여줍니다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      "[cron/auto-hold-stale-listings] CRON_SECRET 환경변수가 설정되어 있지 않습니다.",
    );
    return NextResponse.json(
      { error: "CRON_SECRET이 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  const listings = await getAllListings({ includeDrafts: true });
  const candidates = findAutoHoldCandidates(listings);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      eligibleCount: candidates.length,
      candidates,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, heldCount: 0, held: [] });
  }

  // 안전장치: 날짜 계산이나 데이터에 문제가 생겨 대상이 비정상적으로 많이
  // 걸리면, 156건이 한꺼번에 사라지는 사고를 막기 위해 아무것도 바꾸지
  // 않고 건수만 기록합니다.
  if (candidates.length > AUTO_HOLD_MAX_PER_RUN) {
    console.warn(
      `[cron/auto-hold-stale-listings] 안전장치 작동 — 대상 ${candidates.length}건이 ` +
        `상한 ${AUTO_HOLD_MAX_PER_RUN}건을 넘어 아무것도 바꾸지 않았습니다.`,
    );
    return NextResponse.json({
      ok: true,
      action: "skipped_safety_cap",
      eligibleCount: candidates.length,
      cap: AUTO_HOLD_MAX_PER_RUN,
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase 관리자 연결이 없습니다." },
      { status: 500 },
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ deal_status: "hold", auto_held_at: new Date().toISOString() })
    .in(
      "id",
      candidates.map((candidate) => candidate.id),
    );

  if (error) {
    console.error("[cron/auto-hold-stale-listings] 보류 처리 실패", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 푸시 발송 실패는 보류 처리 자체의 성공 여부와 무관합니다 — 이미 DB
  // 갱신이 끝난 뒤라 여기서 던져도 되돌릴 수 없고, cron 응답까지 실패로
  // 만들 이유가 없습니다.
  sendAutoHoldPush(candidates.length).catch((pushError) =>
    console.error("[cron/auto-hold-stale-listings] 웹 푸시 실패", pushError),
  );

  return NextResponse.json({ ok: true, heldCount: candidates.length, held: candidates });
}
