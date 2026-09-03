import { NextRequest, NextResponse } from "next/server";
import {
  createConsultationTask,
  getAllConsultationTasks,
} from "../../../lib/consultations";
import type { ConsultationTaskStatus } from "../../../data/consultations";

const STATUSES: ConsultationTaskStatus[] = ["open", "done"];

/** 후속조치 목록 조회. ?status=open, ?customerId=, ?consultationId=로 좁힐 수 있습니다. */
export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get("status");
  const customerId = request.nextUrl.searchParams.get("customerId") ?? undefined;
  const consultationId = request.nextUrl.searchParams.get("consultationId") ?? undefined;

  const status =
    statusParam && STATUSES.includes(statusParam as ConsultationTaskStatus)
      ? (statusParam as ConsultationTaskStatus)
      : undefined;

  const tasks = await getAllConsultationTasks({ status, customerId, consultationId });
  return NextResponse.json({ tasks });
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

  const data = body as {
    consultationId?: unknown;
    customerId?: unknown;
    taskType?: unknown;
    description?: unknown;
    dueDate?: unknown;
  };

  if (typeof data.description !== "string" || !data.description.trim()) {
    return NextResponse.json({ errors: ["내용을 입력해주세요."] }, { status: 400 });
  }

  const result = await createConsultationTask({
    consultationId: typeof data.consultationId === "string" ? data.consultationId : undefined,
    customerId: typeof data.customerId === "string" ? data.customerId : undefined,
    taskType: typeof data.taskType === "string" ? data.taskType : undefined,
    description: data.description,
    dueDate: typeof data.dueDate === "string" ? data.dueDate : undefined,
  });

  if (result.error) {
    return NextResponse.json({ errors: [result.error] }, { status: 400 });
  }
  return NextResponse.json({ task: result.task }, { status: 201 });
}
