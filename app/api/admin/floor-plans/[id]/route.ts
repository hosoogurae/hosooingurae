import { NextRequest, NextResponse } from "next/server";
import {
  deleteFloorPlanImage,
  updateFloorPlanImage,
} from "../../../../lib/floorPlans";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 타입명 오타 수정, 또는 기존에 올려둔 평면도에 면적만 나중에 채워 넣을 때
 * 사용합니다. unitType/supplyArea/exclusiveArea 중 있는 것만 반영합니다.
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

  const payload = body as {
    unitType?: unknown;
    supplyArea?: unknown;
    exclusiveArea?: unknown;
  };
  const updates: {
    unitType?: string;
    supplyArea?: number | null;
    exclusiveArea?: number | null;
  } = {};

  if (payload.unitType !== undefined) {
    if (typeof payload.unitType !== "string" || payload.unitType.trim() === "") {
      return NextResponse.json(
        { errors: ["타입명을 입력해주세요."] },
        { status: 400 },
      );
    }
    updates.unitType = payload.unitType.trim();
  }

  function parsePositiveAreaField(
    raw: unknown,
    label: string,
  ): { value?: number | null; error?: string } {
    if (raw === null || raw === "") return { value: null };
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { error: `${label}은 0보다 큰 숫자로 입력해주세요.` };
    }
    return { value: parsed };
  }

  if (payload.supplyArea !== undefined) {
    const result = parsePositiveAreaField(payload.supplyArea, "공급면적");
    if (result.error) {
      return NextResponse.json({ errors: [result.error] }, { status: 400 });
    }
    updates.supplyArea = result.value;
  }

  if (payload.exclusiveArea !== undefined) {
    const result = parsePositiveAreaField(payload.exclusiveArea, "전용면적");
    if (result.error) {
      return NextResponse.json({ errors: [result.error] }, { status: 400 });
    }
    updates.exclusiveArea = result.value;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { errors: ["수정할 값이 없습니다."] },
      { status: 400 },
    );
  }

  const { image, error, errorDetail } = await updateFloorPlanImage(id, updates);
  if (!image) {
    return NextResponse.json(
      { errors: [error ?? "수정에 실패했습니다."], errorDetail },
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
