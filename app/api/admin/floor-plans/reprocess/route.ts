import { NextResponse } from "next/server";
import { reprocessAllFloorPlanImages } from "../../../../lib/floorPlans";

/**
 * 이미 업로드된 모든 평면도 이미지의 미리보기(preview_url)를 원본에서 다시
 * 만듭니다(같은 경로에 덮어쓰기 — url은 바뀌지 않음). 잘라내지 않고 비율
 * 유지 축소만 합니다. 관리자가 필요할 때 수동으로 호출합니다.
 */
export async function POST() {
  const { results } = await reprocessAllFloorPlanImages();
  const succeeded = results.filter((r) => r.success).length;
  return NextResponse.json({ succeeded, total: results.length, results });
}
