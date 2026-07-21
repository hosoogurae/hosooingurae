import { NextRequest, NextResponse } from "next/server";
import { createComplex, getAllComplexes } from "../../lib/complexes";

export async function GET() {
  const complexes = await getAllComplexes();
  const complexOptions = complexes.map((complex) => ({
    id: complex.id,
    name: complex.name,
    address: complex.address,
  }));

  return NextResponse.json({ complexOptions });
}

/**
 * 네이버 가져오기 화면에서 기존 단지와 매칭되지 않는 미등록 단지를 관리자가
 * "새 단지 등록" 버튼으로 직접 등록할 때 사용합니다. 자동으로 호출되지 않고,
 * 반드시 관리자의 명시적인 제출로만 호출됩니다.
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

  const { name, address, propertyType } =
    (body as { name?: unknown; address?: unknown; propertyType?: unknown } | null) ??
    {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  // 주소는 선택 항목입니다 — 모르면 비워두고 나중에 매물 관리 화면에서 채웁니다.
  const trimmedAddress = typeof address === "string" ? address.trim() : "";

  if (!trimmedName) {
    return NextResponse.json(
      { errors: ["단지명을 입력해주세요."] },
      { status: 400 },
    );
  }

  const { complex, error } = await createComplex({
    name: trimmedName,
    address: trimmedAddress,
    propertyType: typeof propertyType === "string" ? propertyType : "아파트",
  });

  if (!complex) {
    return NextResponse.json(
      { errors: [error ?? "단지 생성에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ complex }, { status: 201 });
}
