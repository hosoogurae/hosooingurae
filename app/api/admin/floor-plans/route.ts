import { NextRequest, NextResponse } from "next/server";
import {
  getFloorPlanImagesByComplex,
  uploadFloorPlanImage,
} from "../../../lib/floorPlans";

/** 관리자 화면(/admin/floor-plans)에서 특정 단지의 평면도 전체 목록을 볼 때 사용합니다. */
export async function GET(request: NextRequest) {
  const complexId = request.nextUrl.searchParams.get("complexId");
  if (!complexId) {
    return NextResponse.json(
      { errors: ["complexId가 필요합니다."] },
      { status: 400 },
    );
  }

  const images = await getFloorPlanImagesByComplex(complexId);
  return NextResponse.json({ images });
}

/** multipart/form-data: complexId, unitType, file. 관리자가 직접 올린 파일만 받습니다. */
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
      { errors: ["타입명을 입력해주세요."] },
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

  const { image, error } = await uploadFloorPlanImage({
    complexId: complexId.trim(),
    unitType: unitType.trim(),
    fileName: file.name,
    contentType: file.type,
    bytes,
  });

  if (!image) {
    return NextResponse.json(
      { errors: [error ?? "업로드에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ image }, { status: 201 });
}
