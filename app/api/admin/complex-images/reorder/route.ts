import { NextRequest, NextResponse } from "next/server";
import { getComplexImages, reorderComplexImages } from "../../../../lib/complexImages";

/** body: { complexId, orderedIds }. 대표사진 지정도 "맨 앞으로 이동"으로 이 API를 그대로 씁니다. */
export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { complexId, orderedIds } =
    (body as { complexId?: unknown; orderedIds?: unknown } | null) ?? {};

  if (typeof complexId !== "string" || complexId.trim() === "") {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }
  if (!Array.isArray(orderedIds) || !orderedIds.every((v) => typeof v === "string")) {
    return NextResponse.json(
      { errors: ["순서 정보가 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { success, error } = await reorderComplexImages(complexId, orderedIds);
  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "순서 저장에 실패했습니다."] },
      { status: 500 },
    );
  }

  const images = await getComplexImages(complexId);
  return NextResponse.json({ images });
}
