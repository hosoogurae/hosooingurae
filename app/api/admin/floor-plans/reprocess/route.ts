import { NextResponse } from "next/server";
import { reprocessAllFloorPlanImages } from "../../../../lib/floorPlans";

/**
 * 이미 업로드된 모든 평면도 이미지의 흰 여백을 다시 크롭합니다(같은 경로에
 * 덮어쓰기 — url은 바뀌지 않음). 관리자가 필요할 때 수동으로 호출합니다.
 */
export async function POST() {
  const { results } = await reprocessAllFloorPlanImages();
  const succeeded = results.filter((r) => r.success).length;
  return NextResponse.json({ succeeded, total: results.length, results });
}
