import { NextRequest, NextResponse } from "next/server";
import {
  createContractPrepItem,
  getAllContractPrepItems,
  type ContractPrepItemRole,
} from "../../../lib/contractPrepItems";

const VALID_ROLES = [
  "공통",
  "매수인",
  "매도인",
  "임차인",
  "임대인",
  "공동명의",
  "대리계약",
  "법인계약",
];

/** 계약 준비물 안내 문자 화면의 역할별 체크박스 항목 목록. */
export async function GET() {
  const items = await getAllContractPrepItems();
  return NextResponse.json({ items });
}

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

  const { role, label, sortOrder, defaultChecked } =
    (body as {
      role?: unknown;
      label?: unknown;
      sortOrder?: unknown;
      defaultChecked?: unknown;
    } | null) ?? {};

  if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { errors: [`역할은 ${VALID_ROLES.join(", ")} 중 하나여야 합니다.`] },
      { status: 400 },
    );
  }

  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  if (!trimmedLabel) {
    return NextResponse.json({ errors: ["항목 이름을 입력해주세요."] }, { status: 400 });
  }

  const { item, error } = await createContractPrepItem({
    role: role as ContractPrepItemRole,
    label: trimmedLabel,
    sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    defaultChecked: typeof defaultChecked === "boolean" ? defaultChecked : undefined,
  });

  if (!item) {
    return NextResponse.json(
      { errors: [error ?? "항목 저장에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ item }, { status: 201 });
}
