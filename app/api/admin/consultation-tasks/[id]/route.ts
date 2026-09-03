import { NextRequest, NextResponse } from "next/server";
import { updateConsultationTask } from "../../../../lib/consultations";
import type { ConsultationTaskStatus } from "../../../../data/consultations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const STATUSES: ConsultationTaskStatus[] = ["open", "done"];

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
    description?: unknown;
    dueDate?: unknown;
    status?: unknown;
  };

  if (data.status !== undefined && !STATUSES.includes(data.status as ConsultationTaskStatus)) {
    return NextResponse.json({ errors: ["상태 값이 올바르지 않습니다."] }, { status: 400 });
  }

  const result = await updateConsultationTask(id, {
    description: typeof data.description === "string" ? data.description : undefined,
    dueDate:
      data.dueDate === null
        ? null
        : typeof data.dueDate === "string"
          ? data.dueDate
          : undefined,
    status:
      data.status !== undefined ? (data.status as ConsultationTaskStatus) : undefined,
  });

  if (result.error) {
    return NextResponse.json({ errors: [result.error] }, { status: 400 });
  }
  return NextResponse.json({ task: result.task });
}
