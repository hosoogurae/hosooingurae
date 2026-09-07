import { NextRequest, NextResponse } from "next/server";
import {
  deleteContractPrepItem,
  updateContractPrepItem,
} from "../../../../lib/contractPrepItems";

const VALID_ROLES = ["공통", "매수인", "매도인", "임차인", "임대인"];

interface RouteContext {
  params: Promise<{ id: string }>;
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

  const { role, label, sortOrder } =
    (body as { role?: unknown; label?: unknown; sortOrder?: unknown } | null) ?? {};

  if (role !== undefined && (typeof role !== "string" || !VALID_ROLES.includes(role))) {
    return NextResponse.json(
      { errors: [`역할은 ${VALID_ROLES.join(", ")} 중 하나여야 합니다.`] },
      { status: 400 },
    );
  }
  if (label !== undefined && typeof label !== "string") {
    return NextResponse.json({ errors: ["항목 이름이 올바르지 않습니다."] }, { status: 400 });
  }
  if (sortOrder !== undefined && typeof sortOrder !== "number") {
    return NextResponse.json({ errors: ["순서 값이 올바르지 않습니다."] }, { status: 400 });
  }

  const trimmedLabel = typeof label === "string" ? label.trim() : undefined;
  if (trimmedLabel === "") {
    return NextResponse.json({ errors: ["항목 이름을 입력해주세요."] }, { status: 400 });
  }

  const { item, error } = await updateContractPrepItem(id, {
    role: role as "공통" | "매수인" | "매도인" | "임차인" | "임대인" | undefined,
    label: trimmedLabel,
    sortOrder: sortOrder as number | undefined,
  });

  if (!item) {
    return NextResponse.json(
      { errors: [error ?? "항목 수정에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ item });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const { success, error } = await deleteContractPrepItem(id);
  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
