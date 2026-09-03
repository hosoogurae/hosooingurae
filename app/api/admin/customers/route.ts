import { NextRequest, NextResponse } from "next/server";
import { createCustomer, getAllCustomers } from "../../../lib/customers";

/** 고객 목록 조회. ?search=로 이름/연락처 검색. */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const customers = await getAllCustomers({ search });
  return NextResponse.json({ customers });
}

/**
 * 신규 고객 등록. 연락처가 이미 등록된 고객과 같으면 새로 만들지 않고
 * duplicate로 기존 고객을 돌려줍니다(200) — 화면에서 안내 후 기존 고객과
 * 연결할지 사용자가 선택합니다. 이름만으로는 절대 중복 처리하지 않습니다.
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

  const data = body as {
    name?: unknown;
    phone?: unknown;
    memo?: unknown;
    desiredTransactionType?: unknown;
    desiredArea?: unknown;
  };

  if (typeof data.name !== "string" || !data.name.trim()) {
    return NextResponse.json({ errors: ["이름을 입력해주세요."] }, { status: 400 });
  }

  const result = await createCustomer({
    name: data.name,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    memo: typeof data.memo === "string" ? data.memo : undefined,
    desiredTransactionType:
      typeof data.desiredTransactionType === "string"
        ? (data.desiredTransactionType as "매매" | "전세" | "월세")
        : undefined,
    desiredArea: typeof data.desiredArea === "string" ? data.desiredArea : undefined,
  });

  if (result.error) {
    return NextResponse.json({ errors: [result.error] }, { status: 400 });
  }
  if (result.duplicate) {
    return NextResponse.json({
      duplicate: result.duplicate,
      error: "이미 등록된 연락처입니다.",
    });
  }
  return NextResponse.json({ customer: result.customer }, { status: 201 });
}
