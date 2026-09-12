/**
 * "지역 소식" 수집(app/api/cron/notices/route.ts) 제목 필터 전용 순수 함수.
 * 사무소가 보는 범위가 손님이 보는 범위를 포함합니다 — 손님이 아는 소식을
 * 중개사가 모르면 안 되기 때문입니다.
 *
 * 단어 목록은 임의로 늘리거나 줄이지 않습니다(요청받은 그대로).
 */

/** 손님 관련 단어 — 걸리면 나중에 손님에게 공개할 후보(customerCandidate)입니다. */
export const CUSTOMER_KEYWORDS = [
  "김포",
  "구래",
  "마산동",
  "장기동",
  "운양",
  "한강신도시",
  "지구단위계획",
  "도시계획",
  "용도지역",
  "개발행위",
  "도로지정",
  "분양",
  "청약",
  "입주",
  "전세",
  "월세",
  "임대차",
  "주택공급",
  "아파트",
  "재건축",
  "재개발",
];

/** 사무소가 업무상 알아야 하지만 손님에게 바로 보여줄 내용은 아닌 추가 단어. */
export const OFFICE_KEYWORDS = [
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
 * 공백·가운뎃점(·) 차이로 놓치지 않도록 제목과 단어 양쪽에서 이 문자들을
 * 지운 뒤 비교합니다("표시·광고"/"표시 광고"/"표시광고"가 전부 동일하게
 * 처리됩니다).
 */
function normalize(text: string): string {
  return text.replace(/[\s·]/g, "");
}

const NORMALIZED_CUSTOMER_KEYWORDS = CUSTOMER_KEYWORDS.map(normalize);
const NORMALIZED_OFFICE_KEYWORDS = OFFICE_KEYWORDS.map(normalize);

export interface NoticeKeywordMatch {
  /** 두 목록 중 어디든 걸렸는가 — 저장할 가치가 있는가. */
  matched: boolean;
  /** 손님 관련 단어에 걸렸는가 — 나중에 공개할 후보인가. */
  customerCandidate: boolean;
}

export function matchNoticeKeywords(title: string): NoticeKeywordMatch {
  const normalizedTitle = normalize(title);
  const customerCandidate = NORMALIZED_CUSTOMER_KEYWORDS.some((keyword) =>
    normalizedTitle.includes(keyword),
  );
  const officeMatched = NORMALIZED_OFFICE_KEYWORDS.some((keyword) =>
    normalizedTitle.includes(keyword),
  );
  return { matched: customerCandidate || officeMatched, customerCandidate };
}
