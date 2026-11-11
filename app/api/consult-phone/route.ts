import { NextRequest, NextResponse } from "next/server";
import { getConsultPhone, isConsultStyle } from "../../lib/consultPhones";

/**
 * 홈 「나랑 맞는 상담 스타일 고르기」에서 손님이 선택지를 누른 순간에만
 * 호출됩니다. 요청 본문: { style: "fact" | "heart" } → 응답: { phone }
 *
 * 번호를 페이지 HTML·JS 번들에 미리 넣지 않고 여기서 받아가게 한 이유는
 * "링크를 따라 HTML을 긁는 단순 수집 봇"을 거르기 위해서입니다.
 * 그래서 GET이 아니라 POST로만 응답합니다(크롤러는 링크를 GET으로 따라감).
 *
 * 한계(의도된 설계): 작정하고 이 주소로 POST를 보내는 사람은 막지 못합니다.
 * 이 번호들은 손님에게 보여주려고 공개하는 번호라서 그 정도는 감수하기로
 * 했고, rate limit·캡차 같은 방어는 복잡도에 비해 얻는 게 적어 일부러
 * 넣지 않았습니다. 이 기능은 아무것도 저장하지 않습니다(DB·푸시·로그 없음).
 *
 * 로그 주의: 번호를 console.*·에러 메시지에 절대 남기지 않습니다.
 */

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400, headers: NO_STORE },
    );
  }

  const style =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).style
      : undefined;

  if (!isConsultStyle(style)) {
    return NextResponse.json(
      { error: "상담 스타일이 올바르지 않습니다." },
      { status: 400, headers: NO_STORE },
    );
  }

  const phone = getConsultPhone(style);
  if (!phone) {
    return NextResponse.json(
      { error: "번호가 설정되어 있지 않습니다." },
      { status: 404, headers: NO_STORE },
    );
  }

  return NextResponse.json({ phone }, { headers: NO_STORE });
}
