import { NextRequest, NextResponse } from "next/server";
import {
  deleteListingSubmission,
  getListingSubmissionById,
  updateListingSubmissionStatus,
} from "../../../../lib/listingSubmissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const STATUSES = ["new", "confirmed", "converted"];

/** "매물로 등록" 화면에서 접수 건 값을 미리 채울 때 조회합니다. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const submission = await getListingSubmissionById(id);
  if (!submission) {
    return NextResponse.json(
      { error: "접수 건을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ submission });
}

/**
 * 확인완료 버튼, 그리고 매물 저장이 실제로 성공한 뒤에만 호출되는 "매물로
 * 등록" 완료 처리(convertedListingId 포함)에 사용합니다.
 */
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

  const { status, convertedListingId } =
    (body as { status?: unknown; convertedListingId?: unknown }) ?? {};
  if (typeof status !== "string" || !STATUSES.includes(status)) {
    return NextResponse.json(
      { errors: ["상태 값이 올바르지 않습니다."] },
      { status: 400 },
    );
  }
  if (convertedListingId !== undefined && typeof convertedListingId !== "string") {
    return NextResponse.json(
      { errors: ["convertedListingId 값이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { submission, error } = await updateListingSubmissionStatus(
    id,
    status as "new" | "confirmed" | "converted",
    convertedListingId,
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
