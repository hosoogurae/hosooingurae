import { NextRequest, NextResponse } from "next/server";
import { getListingPhotos, uploadListingPhoto } from "../../../../../lib/listingPhotos";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** /admin/listings/[id]/edit 화면에서 현재 등록된 사진 전체를 순서대로 가져올 때 사용합니다. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const photos = await getListingPhotos(id);
  return NextResponse.json({ photos });
}

/** multipart/form-data: file. 한 번에 한 장씩 업로드합니다(평면도 업로드와 동일한 방식). */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { errors: ["이미지 파일을 선택해주세요."] },
      { status: 400 },
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { errors: ["이미지 파일만 업로드할 수 있습니다."] },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { photo, error, errorDetail } = await uploadListingPhoto({
    listingId: id,
    fileName: file.name,
    contentType: file.type,
    bytes,
  });

  if (!photo) {
    return NextResponse.json(
      { errors: [error ?? "업로드에 실패했습니다."], errorDetail },
      { status: 500 },
    );
  }

  return NextResponse.json({ photo }, { status: 201 });
}
