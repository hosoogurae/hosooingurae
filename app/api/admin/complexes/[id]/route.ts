import { NextRequest, NextResponse } from "next/server";
import {
  deleteComplex,
  getComplexById,
  getComplexDeletionInfo,
  updateComplex,
} from "../../../../lib/complexes";
import { parseComplexFieldsInput } from "../../../../lib/complexValidation";

/** /admin/complexes/[id]/edit 초기 로딩 전용. 삭제 UI가 쓸 참조 건수도 함께 내려줍니다. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const complex = await getComplexById(id);

  if (!complex) {
    return NextResponse.json({ errors: ["단지를 찾을 수 없습니다."] }, { status: 404 });
  }

  const deletionInfo = await getComplexDeletionInfo(id);

  return NextResponse.json({ complex, deletionInfo });
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

/**
 * /admin/complexes/[id]/edit의 "위험 구역" 전용. service_role(관리자) 클라이언트로만
 * 실행합니다 — 클라이언트가 Supabase를 직접 호출해 지우는 경로는 없습니다.
 * 매물이 남아있으면 listings.complex_id의 ON DELETE RESTRICT(DB)가 최종적으로
 * 막고, 그 에러를 deleteComplex가 사람이 이해할 수 있는 메시지로 바꿔줍니다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await getComplexById(id);
  if (!existing) {
    return NextResponse.json({ errors: ["단지를 찾을 수 없습니다."] }, { status: 404 });
  }

  const { success, error } = await deleteComplex(id);

  if (!success) {
    const isBlocked = error === "이 단지에 연결된 매물이 있어 삭제할 수 없습니다.";
    return NextResponse.json(
      { errors: [error ?? "단지를 삭제하지 못했습니다."] },
      { status: isBlocked ? 409 : 500 },
    );
  }

  return NextResponse.json({ success: true });
}
