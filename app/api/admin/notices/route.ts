import { NextResponse } from "next/server";
import { getAllNotices } from "../../../lib/notices";

/** 관리자 "지역 소식" 화면(/admin/tools/notices) 전용 조회 API. 상태 무관 전체를 내려주고, 필터는 화면에서 처리합니다. */
export async function GET() {
  const notices = await getAllNotices();
  return NextResponse.json({ notices });
}
