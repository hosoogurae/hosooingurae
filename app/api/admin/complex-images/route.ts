import { NextRequest, NextResponse } from "next/server";
import { COMPLEX_IMAGE_CATEGORIES, type ComplexImageCategory } from "../../../data/complexImages";
import { getComplexImages, uploadComplexImage } from "../../../lib/complexImages";

function isComplexImageCategory(value: string): value is ComplexImageCategory {
  return (COMPLEX_IMAGE_CATEGORIES as readonly string[]).includes(value);
}

/** 관리자 화면(/admin/complexes/[id]/edit)에서 단지 공통 사진 전체를 순서대로 가져올 때 사용합니다. */
export async function GET(request: NextRequest) {
  const complexId = request.nextUrl.searchParams.get("complexId");
  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const images = await getComplexImages(complexId);
  return NextResponse.json({ images });
}

/** multipart/form-data: complexId, category, file. */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const complexId = form.get("complexId");
  const category = form.get("category");
  const file = form.get("file");

  if (typeof complexId !== "string" || complexId.trim() === "") {
    return NextResponse.json(
      { errors: ["단지를 선택해주세요."] },
      { status: 400 },
    );
  }
  if (typeof category !== "string" || !isComplexImageCategory(category)) {
    return NextResponse.json(
      { errors: ["사진 분류를 선택해주세요."] },
      { status: 400 },
    );
  }
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

  const { image, error, errorDetail } = await uploadComplexImage({
    complexId: complexId.trim(),
    category,
    fileName: file.name,
    contentType: file.type,
    bytes,
  });

  if (!image) {
    return NextResponse.json(
      { errors: [error ?? "업로드에 실패했습니다."], errorDetail },
      { status: 500 },
    );
  }

  return NextResponse.json({ image }, { status: 201 });
}
