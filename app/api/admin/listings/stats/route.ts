import { NextResponse } from "next/server";
import { getListingStats } from "../../../../lib/listings";

/** 관리자 매물 관리 화면 상단 통계 카드용. Supabase count(head: true)로 매번 새로 집계합니다. */
export async function GET() {
  const stats = await getListingStats();
  return NextResponse.json({ stats });
}
