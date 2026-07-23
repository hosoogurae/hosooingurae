import { NextRequest, NextResponse } from "next/server";
import { updateComplex } from "../../../../lib/complexes";

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

  const { name, address, propertyType } =
    (body as {
      name?: unknown;
      address?: unknown;
      propertyType?: unknown;
    } | null) ?? {};

  if (name !== undefined && typeof name !== "string") {
    return NextResponse.json(
      { errors: ["단지명 값이 올바르지 않습니다."] },
      { status: 400 },
    );
  }
  if (address !== undefined && typeof address !== "string") {
    return NextResponse.json(
      { errors: ["주소 값이 올바르지 않습니다."] },
      { status: 400 },
    );
  }
  if (propertyType !== undefined && typeof propertyType !== "string") {
    return NextResponse.json(
      { errors: ["건축물 용도 값이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const trimmedName = typeof name === "string" ? name.trim() : undefined;
  if (trimmedName === "") {
    return NextResponse.json(
      { errors: ["단지명을 입력해주세요."] },
      { status: 400 },
    );
  }

  const { complex, error } = await updateComplex(id, {
    name: trimmedName,
    address: typeof address === "string" ? address.trim() : undefined,
    propertyType: typeof propertyType === "string" ? propertyType.trim() : undefined,
  });

  if (!complex) {
    return NextResponse.json(
      { errors: [error ?? "단지 정보를 수정하지 못했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ complex });
}
