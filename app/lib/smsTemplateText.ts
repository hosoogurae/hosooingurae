/**
 * 관리자 문자 발송 화면 전용 — 순수 텍스트 로직만 담습니다(Supabase 등
 * 서버 전용 코드를 여기 섞지 않습니다). 클라이언트 컴포넌트(문자 작성
 * 화면)에서 그대로 import해서 씁니다.
 *
 * 사무소명·주소·전화번호는 app/data/contact.ts 값만 씁니다 — 출처를
 * 한 곳으로 유지하기 위해 별도 환경변수나 하드코딩을 두지 않습니다.
 * {홈페이지URL}만 예외로, 도메인이 바뀌어도 양식을 일일이 안 고치도록
 * NEXT_PUBLIC_SITE_URL에서 읽습니다(빌드 시 클라이언트 번들에 인라인됨).
 */

import { ADDRESS_LINES, COMPANY_NAME, PHONE_NUMBER } from "../data/contact";

export interface DefaultSmsTemplate {
  id: string;
  label: string;
  body: string;
}

/**
 * hosoo-admin-app(Expo, 더 이상 개발 안 함)의 src/lib/sms.ts에 있던 문구를
 * 그대로 옮겼습니다. "문의하신 매물 안내"(매물 여러 건을 골라 채우는
 * 템플릿)는 이번 단계에서는 옮기지 않았습니다 — 별도의 매물 선택 UI가
 * 필요해서 다음 단계에서 다룹니다.
 */
export const DEFAULT_SMS_TEMPLATES: DefaultSmsTemplate[] = [
  {
    id: "basic",
    label: "기본 안내",
    body: `안녕하세요. ${COMPANY_NAME}입니다.\n문의해주셔서 감사합니다.\n\n홈페이지에서 매물과 구래동 아파트 정보를 확인하실 수 있습니다.\n{홈페이지URL}\n\n문의사항은 편하게 연락주세요. {부동산전화번호}`,
  },
  {
    id: "visit-confirm",
    label: "방문 일정 확인",
    body: `안녕하세요. {사무소명}입니다.\n{날짜} {시간}경 방문 예정으로 확인차 연락드립니다.\n일정에 변동이 있으시면 연락 부탁드립니다.\n문의: {부동산전화번호}`,
  },
  {
    id: "after-consult",
    label: "상담 후 안내",
    body: `${COMPANY_NAME}입니다.\n추가로 궁금한 점 있으시면 언제든 편하게 연락주세요.\n({홈페이지URL})\n☎ {부동산전화번호}`,
  },
];

export interface SmsTemplateVariables {
  complexName?: string;
  address?: string;
  listingPageUrl?: string;
  /** 연락처에서 가져온 받는 사람 이름(있으면). 양식에 {이름} 자리가 있으면 채웁니다. */
  recipientName?: string;
  /**
   * "9월 11일(금)" 형태로 이미 포맷된 날짜 문자열. 포맷 자체는 이 파일이
   * 하지 않고 호출부(문자 작성 화면)가 contractPrepSms.ts의
   * formatContractDateKorean을 재사용해서 만들어 넘깁니다 — 같은 계산을
   * 두 벌 만들지 않기 위함입니다.
   */
  dateLabel?: string;
  /** "오후 3시" 형태로 이미 포맷된 시간 문자열. formatContractTimeKorean 재사용. */
  timeLabel?: string;
}

/**
 * {키} 토큰을 실제 값으로 치환합니다. 값을 모르는 토큰은 지어내거나
 * 빈 문자열로 지우지 않고 그대로 남겨둡니다 — 보내기 전에 사람이
 * 알아채고 직접 채울 수 있어야 합니다.
 */
export function resolveSmsTemplate(body: string, variables: SmsTemplateVariables): string {
  const tokenMap: Record<string, string | undefined> = {
    "{단지명}": variables.complexName,
    "{매물주소}": variables.address,
    "{매물페이지URL}": variables.listingPageUrl,
    "{이름}": variables.recipientName,
    "{홈페이지URL}": process.env.NEXT_PUBLIC_SITE_URL,
    "{사무소명}": COMPANY_NAME,
    "{사무소주소}": ADDRESS_LINES[0],
    "{부동산전화번호}": PHONE_NUMBER,
    "{날짜}": variables.dateLabel,
    "{시간}": variables.timeLabel,
  };

  let text = body;
  for (const [token, value] of Object.entries(tokenMap)) {
    if (value) {
      text = text.split(token).join(value);
    }
  }
  return text;
}

/** 본문에 아직 채워지지 않은 {…} 토큰이 남아있는지 찾아 안내 배너에 씁니다. */
export function findUnresolvedSmsTokens(body: string): string[] {
  const matches = body.match(/\{[^{}]+\}/g);
  return matches ? Array.from(new Set(matches)) : [];
}
