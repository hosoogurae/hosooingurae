/**
 * 홈 하단 「나랑 맞는 상담 스타일 고르기」(app/components/ConsultStylePicker.tsx)가
 * 보여줄 상담 담당자 번호를 읽습니다. 서버 전용 모듈입니다 — 클라이언트
 * 컴포넌트에서 이 파일의 함수를 import하지 마세요(타입만 import하는 건 괜찮습니다).
 *
 * 필요한 환경변수 (Vercel 프로젝트 환경변수 / 로컬 .env.local에 설정):
 *   - CONSULT_PHONE_FACT  : 「팩트만 딱 · T」를 고른 손님에게 보여줄 전화번호
 *   - CONSULT_PHONE_HEART : 「마음도 같이 · F」를 고른 손님에게 보여줄 전화번호
 *
 * 주의:
 *   - 번호 값은 이 저장소(공개 저장소)의 코드·테스트·예제 파일 어디에도 적지 않습니다.
 *     커밋 기록에 한 번 들어가면 지울 수 없습니다.
 *   - NEXT_PUBLIC_ 접두어를 붙이지 않습니다. 붙이면 빌드 시 브라우저 JS에
 *     그대로 박혀 크롤러가 긁어갈 수 있습니다. 번호는 손님이 선택지를 누른
 *     순간에만 POST /api/consult-phone으로 받아갑니다.
 *   - 둘 중 하나라도 비어 있으면 버튼 자체를 숨깁니다(isConsultPickerEnabled).
 *   - 번호를 로그·에러 메시지에 남기지 않습니다.
 */

export type ConsultStyle = "fact" | "heart";

const ENV_NAME_BY_STYLE: Record<ConsultStyle, string> = {
  fact: "CONSULT_PHONE_FACT",
  heart: "CONSULT_PHONE_HEART",
};

export function isConsultStyle(value: unknown): value is ConsultStyle {
  return value === "fact" || value === "heart";
}

/** 설정되지 않았거나 공백뿐이면 null. 호출 시점에 읽습니다(테스트에서 env를 바꿀 수 있도록). */
export function getConsultPhone(style: ConsultStyle): string | null {
  const value = process.env[ENV_NAME_BY_STYLE[style]]?.trim();
  return value ? value : null;
}

/** 두 번호가 모두 있을 때만 true. 화면에는 이 true/false만 넘깁니다(번호는 넘기지 않음). */
export function isConsultPickerEnabled(): boolean {
  return getConsultPhone("fact") !== null && getConsultPhone("heart") !== null;
}
