import { NextResponse } from "next/server";
import { getAllListings } from "../../../lib/listings";

/**
 * 관리자 매물 관리 화면(/admin/listings) 전용 조회 API입니다. 임시저장(draft)
 * 포함, rawSourceText 등 관리자 전용 정보도 그대로 내려줍니다.
 *
 * 로그인 기능은 없으므로 이 경로 자체가 공개 인터넷에 노출됩니다 — 그래서
 * 공개 API(app/api/listings)와 완전히 분리해, 최소한 "정상적으로 사용하면
 * 보이는 화면"에서는 관리자 화면을 거치지 않는 한 이 데이터가 나오지
 * 않도록 합니다.
 */
export async function GET() {
  const listings = await getAllListings({ includeDrafts: true });
  return NextResponse.json({ listings });
}
