import { NextResponse } from "next/server";
import type { ListingWithComplex } from "../../../../lib/listings";
import { getAllListings } from "../../../../lib/listings";
import { fetchRecentAptTrades, MolitApiError } from "../../../../lib/molit";
import { sendNewSuspectedMatchesPush } from "../../../../lib/push";
import { getSupabaseAdminClient } from "../../../../lib/supabase/client";
import {
  findSuspectedMatchesForComplex,
  isEligibleForSuspectedMatchCheck,
  isSuspectedMatchActive,
  type SuspectedMatch,
} from "../../../../lib/suspectedTransactionMatch";

export async function GET() {
  const listings = await getAllListings({ includeDrafts: true });
  const eligibleByComplex = new Map<string, ListingWithComplex[]>();
  for (const listing of listings) {
    if (!isEligibleForSuspectedMatchCheck(listing)) continue;
    if (!listing.complex.molit?.lawdCode || !listing.complex.molit?.aptSeq) continue;
    const group = eligibleByComplex.get(listing.complexId) ?? [];
    group.push(listing);
    eligibleByComplex.set(listing.complexId, group);
  }

  const allMatches: SuspectedMatch[] = [];
  await Promise.all(Array.from(eligibleByComplex.entries()).map(async ([complexId, complexListings]) => {
    const molit = complexListings[0].complex.molit;
    if (!molit) return;
    try {
      const trades = await fetchRecentAptTrades(molit.lawdCode, 12);
      allMatches.push(...findSuspectedMatchesForComplex(
        complexListings,
        trades.filter((trade) => trade.aptSeq === molit.aptSeq),
      ));
    } catch (error) {
      console.error(`[suspected-matches] 단지 ${complexId} 조회 실패`,
        error instanceof MolitApiError ? error.message : error);
    }
  }));

  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const legacyActive = allMatches.filter((match) =>
    isSuspectedMatchActive(match, listingById.get(match.listingId)?.suspectedMatchAcknowledgedAt));
  const supabase = getSupabaseAdminClient();
  if (!supabase || legacyActive.length === 0) return NextResponse.json({ matches: legacyActive, newCount: 0 });

  const keys = legacyActive.map((match) => match.matchKey);
  const { data: events, error } = await supabase
    .from("listing_suspected_match_events")
    .select("match_key,status")
    .in("match_key", keys);
  if (error) return NextResponse.json({ error: `거래 의심 상태 조회 실패: ${error.message}` }, { status: 500 });

  const eventByKey = new Map((events ?? []).map((event) => [event.match_key, event.status]));
  const newMatches = legacyActive.filter((match) => !eventByKey.has(match.matchKey));
  let insertedCount = 0;
  if (newMatches.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("listing_suspected_match_events")
      .upsert(newMatches.map((match) => ({ match_key: match.matchKey, listing_id: match.listingId })),
        { onConflict: "match_key", ignoreDuplicates: true })
      .select("match_key");
    if (insertError) return NextResponse.json({ error: `거래 의심 상태 저장 실패: ${insertError.message}` }, { status: 500 });
    insertedCount = inserted?.length ?? 0;
    if (insertedCount > 0) {
      sendNewSuspectedMatchesPush(insertedCount).catch((pushError) =>
        console.error("[suspected-matches] 웹 푸시 실패", pushError));
    }
  }

  const matches = legacyActive.filter((match) => eventByKey.get(match.matchKey) !== "acknowledged");
  return NextResponse.json({ matches, newCount: insertedCount });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { matchKey?: string } | null;
  if (!body?.matchKey) return NextResponse.json({ error: "확인할 거래 정보가 없습니다." }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 관리자 연결이 없습니다." }, { status: 503 });
  const { data, error } = await supabase
    .from("listing_suspected_match_events")
    .update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("match_key", body.matchKey)
    .select("match_key")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "해당 거래 의심 기록을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
