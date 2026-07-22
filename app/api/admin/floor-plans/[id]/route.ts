import { NextRequest, NextResponse } from "next/server";
import {
  deleteFloorPlanImage,
  renameFloorPlanUnitType,
} from "../../../../lib/floorPlans";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 타입명 오타 등을 고칠 때 사용합니다. */
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

  const unitType = (body as { unitType?: unknown })?.unitType;
  if (typeof unitType !== "string" || unitType.trim() === "") {
    return NextResponse.json(
      { errors: ["타입명을 입력해주세요."] },
      { status: 400 },
    );
  }

  const { image, error } = await renameFloorPlanUnitType(id, unitType.trim());
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
