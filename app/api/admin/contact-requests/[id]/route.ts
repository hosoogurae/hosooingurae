import { NextRequest, NextResponse } from "next/server";
import { updateContactRequestStatus } from "../../../../lib/contactRequests";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const STATUSES = ["new", "contacted", "closed"];

/** 문의함(/admin/contacts)의 상태 변경 버튼에서 호출합니다. */
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

  const { status } = (body as { status?: unknown }) ?? {};
  if (typeof status !== "string" || !STATUSES.includes(status)) {
    return NextResponse.json(
      { errors: ["상태 값이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { contactRequest, error } = await updateContactRequestStatus(
    id,
    status as "new" | "contacted" | "closed",
  );

  if (!contactRequest) {
    return NextResponse.json(
      { errors: [error ?? "상태 변경에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ contactRequest });
}
