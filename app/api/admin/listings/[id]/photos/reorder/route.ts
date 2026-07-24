import { NextRequest, NextResponse } from "next/server";
import { getListingPhotos, reorderListingPhotos } from "../../../../../../lib/listingPhotos";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** body: { orderedIds: string[] } — 대표사진 지정도 "맨 앞으로 이동"으로 이 API를 그대로 씁니다. */
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

  const orderedIds = (body as { orderedIds?: unknown } | null)?.orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.every((v) => typeof v === "string")) {
    return NextResponse.json(
      { errors: ["순서 정보가 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { success, error } = await reorderListingPhotos(id, orderedIds);
  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "순서 저장에 실패했습니다."] },
      { status: 500 },
    );
  }

  const photos = await getListingPhotos(id);
  return NextResponse.json({ photos });
}
