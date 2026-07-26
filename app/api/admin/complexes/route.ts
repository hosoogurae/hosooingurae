import { NextRequest, NextResponse } from "next/server";
import { createComplexFull, getComplexesWithCompletion } from "../../../lib/complexes";
import { parseComplexFieldsInput } from "../../../lib/complexValidation";

/** 단지 정보 관리 화면(/admin/complexes) 전용. 편집에 필요한 전체 필드 + 영역별 완성도를 내려줍니다. */
export async function GET() {
  const complexes = await getComplexesWithCompletion();
  return NextResponse.json({ complexes });
}

/**
 * 신규 단지 등록. 단지명만 있으면 생성됩니다 — 기본정보/AI 검색용 정보/MOLIT
 * 연동을 전부 채워야만 저장 가능한 구조로 만들지 않기 위함입니다. 나머지는
 * /admin/complexes/[id]/edit에서 나중에 얼마든지 보완할 수 있습니다.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { input, errors } = parseComplexFieldsInput(body, { requireName: true });
  if (!input) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const { complex, error } = await createComplexFull({ ...input, name: input.name! });

  if (!complex) {
    return NextResponse.json(
      { errors: [error ?? "단지 생성에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ complex }, { status: 201 });
}
