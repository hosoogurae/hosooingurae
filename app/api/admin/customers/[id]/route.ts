import { NextRequest, NextResponse } from "next/server";
import { getCustomerById, updateCustomer } from "../../../../lib/customers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) {
    return NextResponse.json({ error: "고객을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ customer });
}

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

  const data = body as {
    name?: unknown;
    phone?: unknown;
    memo?: unknown;
    desiredTransactionType?: unknown;
    desiredArea?: unknown;
  };

  const result = await updateCustomer(id, {
    name: typeof data.name === "string" ? data.name : undefined,
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
  return NextResponse.json({ customer: result.customer });
}
