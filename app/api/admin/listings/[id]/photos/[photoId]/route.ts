import { NextRequest, NextResponse } from "next/server";
import { deleteListingPhoto } from "../../../../../../lib/listingPhotos";

interface RouteContext {
  params: Promise<{ id: string; photoId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, photoId } = await params;

  const { success, error } = await deleteListingPhoto(id, photoId);

  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
