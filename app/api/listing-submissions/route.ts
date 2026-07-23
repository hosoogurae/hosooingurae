import { NextRequest, NextResponse } from "next/server";
import { createListingSubmission } from "../../lib/listingSubmissions";

const TRANSACTION_TYPES = ["매매", "전세", "월세"];

/** 공개 매물 접수 폼(app/sell)에서 호출합니다. 로그인 없이 누구나 호출 가능합니다. */
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

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  function requiredString(field: string, label: string): string {
    const value = data[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${label}을(를) 입력해주세요.`);
      return "";
    }
    return value.trim();
  }

  function optionalString(field: string): string | undefined {
    const value = data[field];
    return typeof value === "string" && value.trim() !== ""
      ? value.trim()
      : undefined;
  }

  const complexName = requiredString("complexName", "단지명");
  const transactionType = requiredString("transactionType", "거래유형");
  const desiredPriceLabel = requiredString("desiredPriceLabel", "희망가");
  const contactName = requiredString("contactName", "이름");
  const contactPhone = requiredString("contactPhone", "연락처");

  if (transactionType && !TRANSACTION_TYPES.includes(transactionType)) {
    errors.push("거래유형이 올바르지 않습니다.");
  }

  const building = optionalString("building");
  const floorRaw = data.floor;
  let floor: number | undefined;
  if (typeof floorRaw === "number" && Number.isFinite(floorRaw)) {
    floor = floorRaw;
  } else if (typeof floorRaw === "string" && floorRaw.trim() !== "") {
    const parsed = Number(floorRaw);
    if (!Number.isFinite(parsed)) {
      errors.push("층은 숫자로 입력해주세요.");
    } else {
      floor = parsed;
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const { submission, error } = await createListingSubmission({
    complexName,
    building,
    floor,
    transactionType: transactionType as "매매" | "전세" | "월세",
    desiredPriceLabel,
    occupancyStatus: optionalString("occupancyStatus"),
    interiorCondition: optionalString("interiorCondition"),
    moveOutDate: optionalString("moveOutDate"),
    viewingAvailability: optionalString("viewingAvailability"),
    notes: optionalString("notes"),
    contactName,
    contactPhone,
  });

  if (!submission) {
    return NextResponse.json(
      { errors: [error ?? "접수에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ submission }, { status: 201 });
}
