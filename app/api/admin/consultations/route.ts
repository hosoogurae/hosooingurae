import { NextRequest, NextResponse } from "next/server";
import { getAllConsultations, startConsultation } from "../../../lib/consultations";
import type { ConsultationStatus } from "../../../data/consultations";

const STATUSES: ConsultationStatus[] = ["in_progress", "ended", "discarded"];

/** 상담 목록 조회. ?customerId=, ?status=, ?tag=(예: 반려동물)로 좁힐 수 있습니다. */
export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("customerId") ?? undefined;
  const statusParam = request.nextUrl.searchParams.get("status");
  const tag = request.nextUrl.searchParams.get("tag") ?? undefined;

  const status =
    statusParam && STATUSES.includes(statusParam as ConsultationStatus)
      ? (statusParam as ConsultationStatus)
      : undefined;

  const consultations = await getAllConsultations({ customerId, status, tag });
  return NextResponse.json({ consultations });
}

/** "상담 시작" — customerId 없이도(고객 없이 시작) 호출할 수 있습니다. */
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

  const data = (body as { customerId?: unknown } | null) ?? {};
  const customerId = typeof data.customerId === "string" ? data.customerId : undefined;

  const result = await startConsultation({ customerId });
  if (result.error) {
    return NextResponse.json({ errors: [result.error] }, { status: 400 });
  }
  return NextResponse.json({ consultation: result.consultation }, { status: 201 });
}
