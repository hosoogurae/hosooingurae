/**
 * 관리자 문자 발송 화면 전용 — 순수 텍스트 로직만 담습니다(Supabase 등
 * 서버 전용 코드를 여기 섞지 않습니다). 클라이언트 컴포넌트(문자 작성
 * 화면)에서 그대로 import해서 씁니다.
 *
 * {홈페이지URL}/{부동산전화번호}는 도메인이 바뀌어도 문자 양식을 일일이
 * 고치지 않도록 환경변수(NEXT_PUBLIC_SITE_URL/NEXT_PUBLIC_OFFICE_PHONE)에서
 * 읽습니다. NEXT_PUBLIC_ 접두어라 빌드 시 클라이언트 번들에 인라인됩니다.
 */

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
    body: "안녕하세요. 호수부동산입니다.\n문의해주셔서 감사합니다.\n\n홈페이지에서 매물과 구래동 아파트 정보를 확인하실 수 있습니다.\n{홈페이지URL}\n\n문의사항은 편하게 연락주세요. {부동산전화번호}",
  },
  {
    id: "viewing",
    label: "집 보기 일정 안내",
    body: "안녕하세요. 호수부동산입니다. {단지명} 집 보기 일정 관련 안내드립니다. 편하신 날짜와 시간 알려주시면 조율해드리겠습니다. 문의: {부동산전화번호}",
  },
  {
    id: "after-consult",
    label: "상담 후 안내",
    body: "호수부동산입니다.\n추가로 궁금한 점 있으시면 언제든 편하게 연락주세요.\n({홈페이지URL})\n☎ {부동산전화번호}",
  },
];

export interface SmsTemplateVariables {
  complexName?: string;
  address?: string;
  listingPageUrl?: string;
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
    "{홈페이지URL}": process.env.NEXT_PUBLIC_SITE_URL,
    "{부동산전화번호}": process.env.NEXT_PUBLIC_OFFICE_PHONE,
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
