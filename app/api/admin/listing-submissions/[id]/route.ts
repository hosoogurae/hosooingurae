import { NextRequest, NextResponse } from "next/server";
import {
  deleteListingSubmission,
  updateListingSubmissionStatus,
} from "../../../../lib/listingSubmissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const STATUSES = ["new", "confirmed", "converted"];

/** 확인완료/매물로 등록 버튼에서 상태를 바꿀 때 사용합니다. */
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

  const { submission, error } = await updateListingSubmissionStatus(
    id,
    status as "new" | "confirmed" | "converted",
  );

  if (!submission) {
    return NextResponse.json(
      { errors: [error ?? "상태 변경에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ submission });
}

/** 스팸/중복 접수 정리용입니다. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const { success, error } = await deleteListingSubmission(id);
  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
