import { NextResponse } from "next/server";
import type { ListingWithComplex } from "../../../../lib/listings";
import { getAllListings } from "../../../../lib/listings";
import { fetchRecentAptTrades, MolitApiError } from "../../../../lib/molit";
import {
  findSuspectedMatchesForComplex,
  isEligibleForSuspectedMatchCheck,
  isSuspectedMatchActive,
  type SuspectedMatch,
} from "../../../../lib/suspectedTransactionMatch";

/**
 * /admin/listings가 방문할 때마다 백그라운드로 호출하는 "거래 의심 감지"
 * 전용 조회 API. 매물을 단지별로 묶어 국토부 API를 단지의 aptSeq당 한 번씩만
 * 호출합니다(fetchRecentAptTrades 자체가 1시간 캐시라 반복 방문은 빠릅니다).
 * DB에는 아무것도 쓰지 않고, 매번 다시 계산해서 돌려줍니다.
 */
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

  await Promise.all(
    Array.from(eligibleByComplex.entries()).map(async ([complexId, complexListings]) => {
      const molit = complexListings[0].complex.molit;
      if (!molit) return;

      try {
        const trades = await fetchRecentAptTrades(molit.lawdCode, 12);
        const aptSeqTrades = trades.filter((trade) => trade.aptSeq === molit.aptSeq);
        allMatches.push(...findSuspectedMatchesForComplex(complexListings, aptSeqTrades));
      } catch (error) {
        // 한 단지 조회가 실패해도 나머지 단지는 계속 진행합니다.
        console.error(
          `[api/admin/listings/suspected-matches] 단지 ${complexId} 실거래 조회 실패`,
          error instanceof MolitApiError ? error.message : error,
        );
      }
    }),
  );

  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const activeMatches = allMatches.filter((match) => {
    const listing = listingById.get(match.listingId);
    return isSuspectedMatchActive(match, listing?.suspectedMatchAcknowledgedAt);
  });

  return NextResponse.json({ matches: activeMatches });
}
