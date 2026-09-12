import { NextRequest, NextResponse } from "next/server";
import { updateNoticeStatus } from "../../../../lib/notices";

const VALID_STATUSES = ["new", "published", "hidden"];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** "공개"/"숨김" 전환 전용. 제목·링크·게시일 등 나머지 필드는 이 화면에서 고치지 않습니다. */
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
  if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { errors: [`status는 ${VALID_STATUSES.join(", ")} 중 하나여야 합니다.`] },
      { status: 400 },
    );
  }

  const { notice, error, errorDetail } = await updateNoticeStatus(
    id,
    status as "new" | "published" | "hidden",
  );
  if (!notice) {
    return NextResponse.json(
      { errors: [error ?? "상태 변경에 실패했습니다."], errorDetail },
      { status: 400 },
    );
  }

  return NextResponse.json({ notice });
}
