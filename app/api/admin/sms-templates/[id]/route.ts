import { NextRequest, NextResponse } from "next/server";
import { deleteSmsTemplate, updateSmsTemplate } from "../../../../lib/smsTemplates";

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

  const { name, body: templateBody } =
    (body as { name?: unknown; body?: unknown } | null) ?? {};

  if (name !== undefined && typeof name !== "string") {
    return NextResponse.json({ errors: ["양식 이름이 올바르지 않습니다."] }, { status: 400 });
  }
  if (templateBody !== undefined && typeof templateBody !== "string") {
    return NextResponse.json({ errors: ["문자 내용이 올바르지 않습니다."] }, { status: 400 });
  }

  const trimmedName = typeof name === "string" ? name.trim() : undefined;
  const trimmedBody = typeof templateBody === "string" ? templateBody.trim() : undefined;

  if (trimmedName === "") {
    return NextResponse.json({ errors: ["양식 이름을 입력해주세요."] }, { status: 400 });
  }
  if (trimmedBody === "") {
    return NextResponse.json({ errors: ["문자 내용을 입력해주세요."] }, { status: 400 });
  }

  const { template, error } = await updateSmsTemplate(id, {
    name: trimmedName,
    body: trimmedBody,
  });

  if (!template) {
    return NextResponse.json(
      { errors: [error ?? "양식 수정에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ template });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const { success, error } = await deleteSmsTemplate(id);
  if (!success) {
    return NextResponse.json(
      { errors: [error ?? "삭제에 실패했습니다."] },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
