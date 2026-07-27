import { NextRequest, NextResponse } from "next/server";
import { createSmsTemplate, getAllSmsTemplates } from "../../../lib/smsTemplates";

/** 관리자 앱의 "내 문자양식" 목록 — 부모님 두 분이 함께 쓰는 커스텀 문자 템플릿. */
export async function GET() {
  const templates = await getAllSmsTemplates();
  return NextResponse.json({ templates });
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

  const { name, body: templateBody } =
    (body as { name?: unknown; body?: unknown } | null) ?? {};

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedBody = typeof templateBody === "string" ? templateBody.trim() : "";

  if (!trimmedName) {
    return NextResponse.json({ errors: ["양식 이름을 입력해주세요."] }, { status: 400 });
  }
  if (!trimmedBody) {
    return NextResponse.json({ errors: ["문자 내용을 입력해주세요."] }, { status: 400 });
  }

  const { template, error } = await createSmsTemplate({
    name: trimmedName,
    body: trimmedBody,
  });

  if (!template) {
    return NextResponse.json(
      { errors: [error ?? "양식 저장에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ template }, { status: 201 });
}
