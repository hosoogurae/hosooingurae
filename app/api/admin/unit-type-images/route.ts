import { NextRequest, NextResponse } from "next/server";
import {
  getUnitTypeImages,
  getUnitTypeImagesByComplex,
  uploadUnitTypeImage,
} from "../../../lib/unitTypeImages";

/**
 * 관리자 화면에서 사용. ?complexId=필수, &unitType=은 선택입니다.
 * unitType이 있으면 그 타입 사진만, 없으면 단지의 타입 공통 사진 전체를
 * (타입 선택 드롭다운 구성용으로) 가져옵니다.
 */
export async function GET(request: NextRequest) {
  const complexId = request.nextUrl.searchParams.get("complexId");
  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const unitType = request.nextUrl.searchParams.get("unitType");
  const images = unitType
    ? await getUnitTypeImages(complexId, unitType)
    : await getUnitTypeImagesByComplex(complexId);

  return NextResponse.json({ images });
}

/** multipart/form-data: complexId, unitType, file. */
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
  const unitType = form.get("unitType");
  const file = form.get("file");

  if (typeof complexId !== "string" || complexId.trim() === "") {
    return NextResponse.json(
      { errors: ["단지를 선택해주세요."] },
      { status: 400 },
    );
  }
  if (typeof unitType !== "string" || unitType.trim() === "") {
    return NextResponse.json(
      { errors: ["타입을 선택해주세요."] },
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

  const { image, error, errorDetail } = await uploadUnitTypeImage({
    complexId: complexId.trim(),
    unitType: unitType.trim(),
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
