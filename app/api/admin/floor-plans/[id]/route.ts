import { NextRequest, NextResponse } from "next/server";
import {
  deleteFloorPlanImage,
  updateFloorPlanImage,
} from "../../../../lib/floorPlans";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 타입명 오타 수정, 또는 기존에 올려둔 평면도에 전용면적만 나중에 채워 넣을 때
 * 사용합니다. unitType/exclusiveArea 중 있는 것만 반영합니다.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const payload = body as { unitType?: unknown; exclusiveArea?: unknown };
  const updates: { unitType?: string; exclusiveArea?: number | null } = {};

  if (payload.unitType !== undefined) {
    if (typeof payload.unitType !== "string" || payload.unitType.trim() === "") {
      return NextResponse.json(
        { errors: ["타입명을 입력해주세요."] },
        { status: 400 },
      );
    }
    updates.unitType = payload.unitType.trim();
  }

  if (payload.exclusiveArea !== undefined) {
    if (payload.exclusiveArea === null || payload.exclusiveArea === "") {
      updates.exclusiveArea = null;
    } else {
      const parsed = Number(payload.exclusiveArea);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          { errors: ["전용면적은 0보다 큰 숫자로 입력해주세요."] },
          { status: 400 },
        );
      }
      updates.exclusiveArea = parsed;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { errors: ["수정할 값이 없습니다."] },
      { status: 400 },
    );
  }

  const { image, error } = await updateFloorPlanImage(id, updates);
  if (!image) {
    return NextResponse.json(
      { errors: [error ?? "수정에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ image });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const { success, error } = await deleteFloorPlanImage(id);
  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
