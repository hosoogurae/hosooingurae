import { NextRequest, NextResponse } from "next/server";
import { suggestExclusiveAreaFromListings } from "../../../../lib/floorPlans";

/**
 * 평면도 업로드 화면에서 공급면적을 읽어냈을 때, 같은 단지의 매물 중 같은
 * 공급면적을 가진 매물의 전용면적을 제안받기 위해 부릅니다. 자동 입력이
 * 아니라 화면에 텍스트로만 보여줄 제안입니다.
 */
export async function GET(request: NextRequest) {
  const complexId = request.nextUrl.searchParams.get("complexId");
  const supplyAreaRaw = request.nextUrl.searchParams.get("supplyArea");

  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const supplyArea = Number(supplyAreaRaw);
  if (!supplyAreaRaw || !Number.isFinite(supplyArea) || supplyArea <= 0) {
    return NextResponse.json(
      { errors: ["supplyArea가 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const suggestion = await suggestExclusiveAreaFromListings(complexId, supplyArea);
  return NextResponse.json({ suggestion });
}
