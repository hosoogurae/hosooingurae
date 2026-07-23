import { NextRequest, NextResponse } from "next/server";
import { getFloorPlanImagesByComplex } from "../../lib/floorPlans";

/**
 * 공개 조회: 특정 단지에 등록된 평면도를 타입 구분 없이 전부 내려줍니다.
 * /valuation(우리 집 시세 확인)의 평형 선택 단계에서 타입 카드를 만들 때 씁니다.
 * (기존 /api/admin/floor-plans의 GET과 조회 로직은 같지만, 그쪽은 로그인이
 * 필요한 관리자 전용 경로라 고객이 쓰는 화면에서는 호출할 수 없습니다.)
 */
export async function GET(request: NextRequest) {
  const complexId = request.nextUrl.searchParams.get("complexId");
  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const images = await getFloorPlanImagesByComplex(complexId);
  return NextResponse.json({ images });
}
