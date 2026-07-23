import { NextResponse } from "next/server";
import { getAllListingSubmissions } from "../../../lib/listingSubmissions";

/** 관리자 매물 접수 큐(/admin/listing-submissions) 전용 조회 API입니다. */
export async function GET() {
  const submissions = await getAllListingSubmissions();
  return NextResponse.json({ submissions });
}
