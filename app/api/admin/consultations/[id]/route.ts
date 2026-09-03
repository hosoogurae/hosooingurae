import { NextRequest, NextResponse } from "next/server";
import { getConsultationById, updateConsultation } from "../../../../lib/consultations";
import type {
  FieldConfidence,
  JsonValue,
  TranscriptSpeaker,
} from "../../../../data/consultations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const consultation = await getConsultationById(id);
  if (!consultation) {
    return NextResponse.json({ error: "상담을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ consultation });
}

const SPEAKERS: TranscriptSpeaker[] = ["agent", "customer", "unknown"];
const CONFIDENCES: FieldConfidence[] = ["confirmed", "uncertain"];

/** "상담 진행" 중 자동저장(부분 갱신). 값이 있는 필드만 반영됩니다. */
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

  const data = (body as Record<string, unknown>) ?? {};

  const appendTranscriptRaw = Array.isArray(data.appendTranscript) ? data.appendTranscript : [];
  const appendTranscript = appendTranscriptRaw
    .filter(
      (entry): entry is { speaker: unknown; text: unknown } =>
        typeof entry === "object" && entry !== null,
    )
    .map((entry) => ({
      speaker: SPEAKERS.includes(entry.speaker as TranscriptSpeaker)
        ? (entry.speaker as TranscriptSpeaker)
        : "agent",
      text: typeof entry.text === "string" ? entry.text : "",
    }))
    .filter((entry) => entry.text.trim() !== "");

  const extractedFieldsRaw = Array.isArray(data.extractedFields) ? data.extractedFields : [];
  const extractedFields = extractedFieldsRaw
    .filter(
      (field): field is { fieldKey: unknown; fieldValue: unknown; confidence?: unknown } =>
        typeof field === "object" && field !== null,
    )
    .filter((field) => typeof field.fieldKey === "string" && field.fieldKey.trim() !== "")
    .map((field) => ({
      fieldKey: field.fieldKey as string,
      fieldValue: (field.fieldValue ?? null) as JsonValue,
      confidence: CONFIDENCES.includes(field.confidence as FieldConfidence)
        ? (field.confidence as FieldConfidence)
        : undefined,
    }));

  const result = await updateConsultation(id, {
    customerId:
      data.customerId === null ? null : typeof data.customerId === "string" ? data.customerId : undefined,
    internalMemo: typeof data.internalMemo === "string" ? data.internalMemo : undefined,
    smsDraft: typeof data.smsDraft === "string" ? data.smsDraft : undefined,
    appendTranscript: appendTranscript.length > 0 ? appendTranscript : undefined,
    extractedFields: extractedFields.length > 0 ? extractedFields : undefined,
    removeExtractedFieldKeys: Array.isArray(data.removeExtractedFieldKeys)
      ? data.removeExtractedFieldKeys.filter((key): key is string => typeof key === "string")
      : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
  });

  if (result.error) {
    return NextResponse.json({ errors: [result.error] }, { status: 400 });
  }
  return NextResponse.json({ consultation: result.consultation });
}
