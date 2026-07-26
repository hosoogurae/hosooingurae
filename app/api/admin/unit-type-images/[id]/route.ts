import { NextRequest, NextResponse } from "next/server";
import { deleteUnitTypeImage } from "../../../../lib/unitTypeImages";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** ?complexId=... 쿼리로 소유권을 확인한 뒤 삭제합니다. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const complexId = request.nextUrl.searchParams.get("complexId");

  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const { success, error } = await deleteUnitTypeImage(complexId, id);

  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
