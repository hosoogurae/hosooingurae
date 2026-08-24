import { NextRequest, NextResponse } from "next/server";
import { createContactRequest } from "../../lib/contactRequests";
import { getListingById } from "../../lib/listings";

/** 매물 상세페이지 "연락받기" 폼에서 호출합니다. 로그인 없이 누구나 호출 가능합니다. */
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

  const listingId = requiredString("listingId", "매물 정보");
  const name = requiredString("name", "이름");
  const phone = requiredString("phone", "연락처");
  const preferredTime =
    typeof data.preferredTime === "string" && data.preferredTime.trim() !== ""
      ? data.preferredTime.trim()
      : undefined;
  const consent = data.consent === true;

  if (!consent) {
    errors.push("개인정보 수집·이용에 동의해주세요.");
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // 존재하지 않는 매물 id로 들어오는 요청(오래된 캐시된 페이지, 조작된 요청
  // 등)을 걸러 고아 레코드가 쌓이지 않게 합니다.
  const listing = await getListingById(listingId);
  if (!listing) {
    return NextResponse.json(
      { errors: ["매물을 찾을 수 없습니다."] },
      { status: 404 },
    );
  }

  const { contactRequest, error } = await createContactRequest({
    listingId,
    name,
    phone,
    preferredTime,
  });

  if (!contactRequest) {
    return NextResponse.json(
      { errors: [error ?? "저장에 실패했습니다."] },
      { status: 500 },
    );
  }

  return NextResponse.json({ contactRequest }, { status: 201 });
}
