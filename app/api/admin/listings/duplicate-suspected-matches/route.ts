import { NextResponse } from "next/server";
import { findDuplicateSuspectGroups } from "../../../../lib/duplicateSuspectedMatch";
import { getAllListings } from "../../../../lib/listings";

/**
 * 우리 DB 안에서 같은 매물이 두 번 등록된 것 같은 경우를 찾습니다(사람이
 * 확인하는 안전망 — 자동 확정 없음). 국토부 실거래와 비교하는
 * suspected-matches와는 목적이 다릅니다. getAllListings()는 옵션 없이
 * 호출하면 공개(published) 매물만 돌려주므로, "공개 상태인 매물끼리만
 * 비교한다"는 조건이 이 호출 하나로 충족됩니다.
 */
export async function GET() {
  const listings = await getAllListings();
  const result = findDuplicateSuspectGroups(listings);
  return NextResponse.json(result);
}
