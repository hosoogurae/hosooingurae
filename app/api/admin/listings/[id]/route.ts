import { NextRequest, NextResponse } from "next/server";
import { getListingById } from "../../../../lib/listings";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 관리자 수정 화면(/admin/listings/[id]/edit) 전용 단건 조회 API입니다.
 * 임시저장(draft) 매물도 조회할 수 있고, rawSourceText도 포함합니다.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const listing = await getListingById(id, { includeDrafts: true });

  if (!listing) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ listing });
}
