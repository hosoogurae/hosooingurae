import { NextResponse } from "next/server";
import { getFloorPlanUnitTypesByComplex } from "../../../../lib/floorPlans";

/**
 * 매물 점검 센터의 "평면도 연결 부족" 판정용. 단지별로 등록된 평면도
 * unitType 목록을 한 번에 내려줍니다(/api/admin/floor-plans?complexId=는
 * 단건 조회 전용이라 이 용도로는 쓸 수 없음).
 */
export async function GET() {
  const unitTypesByComplex = await getFloorPlanUnitTypesByComplex();
  return NextResponse.json({ unitTypesByComplex });
}
