import { NextRequest, NextResponse } from "next/server";
import { sendTestPush } from "../../../../lib/push";

/** 관리자 화면 "테스트 알림 보내기" 버튼에서 호출합니다. 실제 문의 없이
 * 지정한 기기(endpoint) 하나로만 테스트 푸시를 보냅니다. */
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

  const { endpoint } = (body as { endpoint?: unknown }) ?? {};
  if (typeof endpoint !== "string") {
    return NextResponse.json(
      { errors: ["endpoint가 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const { error } = await sendTestPush(endpoint);
  if (error) {
    return NextResponse.json({ errors: [error] }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
