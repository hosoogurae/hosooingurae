import { NextRequest, NextResponse } from "next/server";
import { getComplexById, updateComplex } from "../../../../lib/complexes";
import { parseComplexFieldsInput } from "../../../../lib/complexValidation";

/** /admin/complexes/[id]/edit 초기 로딩 전용. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const complex = await getComplexById(id);

  if (!complex) {
    return NextResponse.json({ errors: ["단지를 찾을 수 없습니다."] }, { status: 404 });
  }

  return NextResponse.json({ complex });
}

/**
 * 기본정보/AI 검색용 정보/MOLIT 연동 중 어느 영역이든 부분 수정할 수 있습니다.
 * 전달되지 않은 필드는 건드리지 않고, 명시적으로 null을 보낸 필드만 지웁니다.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { input, errors } = parseComplexFieldsInput(body, { requireName: false });
  if (!input) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const { complex, error } = await updateComplex(id, input);

  if (!complex) {
    return NextResponse.json(
      { errors: [error ?? "단지 정보를 수정하지 못했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ complex });
}
