/**
 * 원문 → intent/synonym 정규화 → (기존) queryParser.ts → scoring.ts
 *
 * 기존 규칙 기반 parser는 정확한 키워드(예: "초등학교", "대단지", "즉시 입주")를
 * 그대로 포함해야만 인식합니다. 이 모듈은 그 앞에서, 사람이 실제로 쓰는 동의어/
 * 관련 표현("초등학생", "아이 키우기", "출퇴근 편한" 등)을 찾아 대응하는 표준
 * 키워드로 치환한 텍스트를 만들어 넘겨줍니다 — queryParser.ts의 정규식은 전혀
 * 손대지 않고, 이 텍스트 치환만으로 기존 인식 로직이 자연스럽게 걸리게 합니다.
 *
 * 여기서 무엇을 하지 않는지가 중요합니다: 이 모듈은 "저렴한"처럼 구체적인
 * 숫자가 없는 표현을 임의의 가격대로 지어내지 않습니다(그건 추측이자 허위
 * 정보이므로 금지). 대신 별도의 상대 비교 신호(priceLow)로만 넘기고, 실제
 * 가격 비교는 scoring.ts가 후보 매물들의 실제 가격끼리 비교해서 처리합니다.
 */

export type SynonymTag =
  | "elementarySchool"
  | "school"
  | "station"
  | "parking"
  | "largeComplex"
  | "moveIn"
  | "priceLow";

export interface MatchedSynonymGroup {
  tag: SynonymTag;
  /** 사용자에게 보여줄 한글 라벨. */
  label: string;
  /** 원문에서 실제로 매치된 표현(정규화 근거로 보여줄 용도). */
  trigger: string;
  /** 이 표현이 정규화된 표준 키워드(기존 parser가 인식하는 형태). 없으면(가격 등) 텍스트 치환 없이 플래그만 넘깁니다. */
  canonical?: string;
}

export interface IntentNormalizationResult {
  /** 동의어를 표준 키워드로 치환한 뒤의 텍스트. 기존 queryParser는 이 텍스트를 봅니다. */
  normalizedText: string;
  /** 어떤 동의어 그룹이 매치됐는지(리포트/화면 표시용). */
  matchedGroups: MatchedSynonymGroup[];
}

interface SynonymRule {
  tag: SynonymTag;
  label: string;
  /** 하나라도 매치되면 이 규칙이 적용됩니다. 순서대로 검사하며 첫 매치만 씁니다. */
  patterns: RegExp[];
  /** 매치된 부분을 이 표준 키워드로 치환합니다. undefined면 텍스트는 안 건드리고 태그만 남깁니다. */
  canonical?: string;
}

// 초등학생/초등/초등학교 → elementary 특정 조건 우선(사용자가 명시한 "단" 규칙).
// "아이"/"자녀"/"학부모"/"아이 키우기"는 초등 특정이 아니라 학교 유무(레벨 무관)만
// 원한다고 보는 게 더 안전합니다 — 안 그러면 "초등학교 있는 아파트"처럼 이미 명확한
// 요청까지 뭉뚱그려 정보 손실이 생깁니다.
const ELEMENTARY_SCHOOL_RULE: SynonymRule = {
  tag: "elementarySchool",
  label: "초등학교(자녀)",
  patterns: [/초등학생/, /초등학교/, /초등(?!학생|학교)/],
  canonical: "초등학교",
};

const GENERIC_SCHOOL_RULE: SynonymRule = {
  tag: "school",
  label: "학교(자녀)",
  // "아이"는 2글자 단독 키워드라 "김포한강아이파크"/"아이디어"처럼 다른
  // 단어에 포함된 경우까지 잡힐 수 있습니다. 앞뒤가 한글 음절로 이어지지
  // 않을 때(=독립된 단어일 때)만 매치하도록 경계를 둡니다("아이 키우기"
  // 같은 복합 표현은 이미 더 구체적이라 이 문제가 없어 그대로 둡니다).
  patterns: [/아이\s*키우기/, /육아/, /학부모/, /자녀/, /(?<![가-힣])아이(?![가-힣])/],
  canonical: "학교",
};

const STATION_RULE: SynonymRule = {
  tag: "station",
  label: "역 접근성",
  // "역세권"/"지하철 가까운" 등은 이미 기존 정규식이 그대로 인식하므로, 여기서는
  // 그 정규식이 못 잡는 "출퇴근 ..." 계열만 표준 키워드("역세권")로 치환합니다.
  patterns: [/출퇴근[가-힣\s]{0,6}(?:편하|편한|좋|수월|괜찮)/],
  canonical: "역세권",
};

const PARKING_RULE: SynonymRule = {
  tag: "parking",
  label: "주차",
  // 기존 정규식(주차 넉넉/충분/여유)이 못 잡는 "주차 편한/편하고", "차 2대/두 대"류만 보강합니다.
  patterns: [/주차\s*(?:가|이)?\s*(?:편하|편한|좋)/, /차\s*(?:두|2)\s*대/],
  canonical: "주차 넉넉",
};

const LARGE_COMPLEX_RULE: SynonymRule = {
  tag: "largeComplex",
  label: "대단지",
  // "대단지"/"세대 많은"은 기존 정규식이 이미 인식하므로 "큰 단지"만 보강합니다.
  patterns: [/큰\s*단지/],
  canonical: "대단지",
};

const MOVE_IN_RULE: SynonymRule = {
  tag: "moveIn",
  label: "즉시입주",
  // "즉시 입주"/"바로 입주"는 기존 정규식이 이미 인식하므로 나머지 표현만 보강합니다.
  patterns: [/당장\s*입주/, /당장\s*들어갈/, /빨리\s*이사/, /바로\s*들어갈/],
  canonical: "즉시 입주",
};

// 가격은 구체적인 숫자가 없으면 절대 임의의 금액을 만들지 않습니다 — scoring.ts에서
// 후보 매물들의 실제 가격끼리 상대 비교하는 신호로만 씁니다(canonical 없음 = 텍스트
// 치환 없이 플래그만).
const PRICE_LOW_RULE: SynonymRule = {
  tag: "priceLow",
  label: "가격(저렴한 편 선호)",
  patterns: [/저렴한|저렴하게|싼\s|싸고|싸게|가성비/],
};

/**
 * scoring.ts의 propertyType 하드필터는 이 배열에 propertyType 계열 규칙이
 * 없다는 전제 위에 서 있습니다(queryParser.ts의 PROPERTY_TYPES 주석 참고).
 * 테스트에서 이 전제를 검증할 수 있도록 export합니다.
 */
export const SYNONYM_RULES: SynonymRule[] = [
  ELEMENTARY_SCHOOL_RULE,
  GENERIC_SCHOOL_RULE,
  STATION_RULE,
  PARKING_RULE,
  LARGE_COMPLEX_RULE,
  MOVE_IN_RULE,
  PRICE_LOW_RULE,
];

export function normalizeIntent(query: string): IntentNormalizationResult {
  let text = query;
  const matchedGroups: MatchedSynonymGroup[] = [];

  for (const rule of SYNONYM_RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (!match) continue;

      matchedGroups.push({
        tag: rule.tag,
        label: rule.label,
        trigger: match[0].trim(),
        canonical: rule.canonical,
      });

      // canonical이 있으면 표준 키워드로, 없으면(가격 선호처럼 텍스트로 옮길
      // 표준형이 없는 경우) 공백으로 지웁니다 — 매치된 원문이 그대로 남아
      // "반영하지 못한 조건"으로 잘못 표시되는 걸 막기 위함입니다.
      text = text.replace(pattern, rule.canonical ?? " ");
      break; // 같은 규칙 안에서는 첫 매치만 반영합니다(중복 방지).
    }
  }

  return { normalizedText: text, matchedGroups };
}
