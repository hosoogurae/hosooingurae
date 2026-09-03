import { NextRequest, NextResponse } from "next/server";
import { endConsultation } from "../../../../../lib/consultations";
import type { JsonValue } from "../../../../../data/consultations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * "상담 종료" 확정 저장. 상담시간/요약/고객조건/확인필요정보/후속조치/
 * 문자초안/내부메모/태그를 한 번에 저장하고, 후속조치는
 * consultation_tasks 행으로도 함께 만듭니다. 저장 전 화면에서 전부
 * 수정할 수 있어야 하므로, 이 호출 자체는 "관리자가 최종 확인한 값"을
 * 그대로 신뢰합니다(서버가 추측해서 채우지 않음).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const data = (body as Record<string, unknown>) ?? {};

  const followUpTasksRaw = Array.isArray(data.followUpTasks) ? data.followUpTasks : [];
  const followUpTasks = followUpTasksRaw
    .filter(
      (task): task is { description: unknown; dueDate?: unknown } =>
        typeof task === "object" && task !== null,
    )
    .filter((task) => typeof task.description === "string" && task.description.trim() !== "")
    .map((task) => ({
      description: task.description as string,
      dueDate: typeof task.dueDate === "string" ? task.dueDate : undefined,
    }));

  const result = await endConsultation(id, {
    durationSeconds:
      typeof data.durationSeconds === "number" ? data.durationSeconds : undefined,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    correctedTranscript:
      typeof data.correctedTranscript === "string" ? data.correctedTranscript : undefined,
    extractedConditions:
      typeof data.extractedConditions === "object" && data.extractedConditions !== null
        ? (data.extractedConditions as Record<string, JsonValue>)
        : undefined,
    uncertainFields: Array.isArray(data.uncertainFields)
      ? data.uncertainFields.filter((key): key is string => typeof key === "string")
      : undefined,
    followUpTasks: followUpTasks.length > 0 ? followUpTasks : undefined,
    smsDraft: typeof data.smsDraft === "string" ? data.smsDraft : undefined,
    internalMemo: typeof data.internalMemo === "string" ? data.internalMemo : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
  });

  if (result.error) {
    return NextResponse.json({ errors: [result.error] }, { status: 400 });
  }
  return NextResponse.json({ consultation: result.consultation });
}
