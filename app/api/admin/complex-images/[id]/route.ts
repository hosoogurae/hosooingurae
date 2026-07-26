import { NextRequest, NextResponse } from "next/server";
import { COMPLEX_IMAGE_CATEGORIES, type ComplexImageCategory } from "../../../../data/complexImages";
import { deleteComplexImage, updateComplexImageCategory } from "../../../../lib/complexImages";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isComplexImageCategory(value: string): value is ComplexImageCategory {
  return (COMPLEX_IMAGE_CATEGORIES as readonly string[]).includes(value);
}

/** body: { category }. 사진 분류만 바꿉니다. */
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

  const category = (body as { category?: unknown } | null)?.category;
  if (typeof category !== "string" || !isComplexImageCategory(category)) {
    return NextResponse.json(
      { errors: ["사진 분류를 선택해주세요."] },
      { status: 400 },
    );
  }

  const { image, error, errorDetail } = await updateComplexImageCategory(id, category);

  if (!image) {
    return NextResponse.json(
      { errors: [error ?? "수정에 실패했습니다."], errorDetail },
      { status: 500 },
    );
  }

  return NextResponse.json({ image });
}

/** ?complexId=... 쿼리로 소유권을 확인한 뒤 삭제합니다. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const complexId = request.nextUrl.searchParams.get("complexId");

  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const { success, error } = await deleteComplexImage(complexId, id);

  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
