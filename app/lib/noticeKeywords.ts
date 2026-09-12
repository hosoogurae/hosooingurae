import type { NoticeSource } from "./noticeSources";

/**
 * "지역 소식" 수집(app/api/cron/notices/route.ts) 제목 필터 전용 순수 함수.
 * 출처마다 기준이 다릅니다 — 김포시 고시공고는 모든 글 제목에 "김포"가
 * 들어있어 지역명으로는 아무것도 못 거르지만(오히려 지역명이 아닌
 * 부동산 성격 단어로 걸러야 함), 국토부는 전국 소식이라 "김포"가 있으면
 * 그 자체로 중요한 글입니다.
 *
 * 단어 목록은 임의로 늘리거나 줄이지 않습니다(요청받은 그대로).
 */

/**
 * 김포시 — 지역명은 빼고 부동산 성격 단어만. 걸리면 그 자체로 손님용
 * 후보입니다(우리 동네 이야기니까).
 */
export const GIMPO_KEYWORDS = [
  "지구단위계획",
  "도시관리계획",
  "도시계획",
  "용도지역",
  "용도지구",
  "개발행위",
  "도로지정",
  "도로구역",
  "토지",
  "지목",
  "건축",
  "공동주택",
  "주택",
  "아파트",
  "분양",
  "재건축",
  "재개발",
  "정비사업",
  "택지",
  "지구지정",
  "실거래",
  "공시지가",
  "개별주택가격",
  "수용",
  "보상",
  "환지",
];

/** 국토부 — 지역명 + 부동산 정책 단어. */
export const MOLIT_KEYWORDS = [
  "김포",
  "구래",
  "한강신도시",
  "주택",
  "아파트",
  "전세",
  "월세",
  "임대차",
  "분양",
  "청약",
  "입주",
  "주택공급",
  "재건축",
  "재개발",
  "공인중개사",
  "중개보수",
  "중개사무소",
  "표시광고",
  "부동산거래신고",
  "실거래",
  "등기",
  "취득세",
  "양도세",
  "종부세",
  "대출",
  "규제지역",
  "조정대상지역",
  "전매제한",
];

/**
 * 국토부 매칭 건 중, 이 목록에도 걸린 것만 손님용 후보로 표시합니다.
 * 공인중개사·세금·규제 관련은 사무소가 알아야 하지만 손님에게 바로
 * 보여줄 내용은 아닙니다.
 */
export const MOLIT_CUSTOMER_KEYWORDS = [
  "김포",
  "구래",
  "한강신도시",
  "주택",
  "아파트",
  "전세",
  "월세",
  "임대차",
  "분양",
  "청약",
  "입주",
  "주택공급",
  "재건축",
  "재개발",
];

/**
 * 공백·가운뎃점(·) 차이로 놓치지 않도록 제목과 단어 양쪽에서 이 문자들을
 * 지운 뒤 비교합니다("표시·광고"/"표시 광고"/"표시광고"가 전부 동일하게
 * 처리됩니다).
 */
function normalize(text: string): string {
  return text.replace(/[\s·]/g, "");
}

function includesAny(normalizedTitle: string, keywords: string[]): boolean {
  return keywords.some((keyword) => normalizedTitle.includes(normalize(keyword)));
}

export interface NoticeKeywordMatch {
  /** 저장할 가치가 있는가(해당 출처 목록 중 어디든 걸렸는가). */
  matched: boolean;
  /** 손님 관련 단어에 걸렸는가 — 나중에 공개할 후보인가. */
  customerCandidate: boolean;
}

export function matchNoticeKeywords(source: NoticeSource, title: string): NoticeKeywordMatch {
  const normalizedTitle = normalize(title);

  if (source === "gimpo") {
    const matched = includesAny(normalizedTitle, GIMPO_KEYWORDS);
    // 김포시는 걸리면 그 자체로 손님용 후보입니다 — 지역명이 아니라
    // 부동산 성격 단어로만 걸렀으므로 별도 부분집합이 필요 없습니다.
    return { matched, customerCandidate: matched };
  }

  const matched = includesAny(normalizedTitle, MOLIT_KEYWORDS);
  const customerCandidate = matched && includesAny(normalizedTitle, MOLIT_CUSTOMER_KEYWORDS);
  return { matched, customerCandidate };
}
