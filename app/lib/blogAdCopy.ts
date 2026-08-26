import type { AdCopyListingInput } from "./adCopy";
import { PHONE_NUMBER } from "../data/contact";
import {
  formatAreaForSentence,
  formatFloorForSentence,
  isUnknownListingNumber,
} from "./format/listingFields";

/**
 * 블로그용 광고문구 — "30대 부동산 전문 블로거가 직접 쓴 느낌"의 자연스러운
 * 장문(1,000~1,500자 내외)을 목표로 합니다. 확인된 필드(shortDescription,
 * features 등)만 재료로 쓰고, 문장으로 풀어쓰거나 표현을 다듬을 뿐 새로운
 * 사실(학군/역세권/시세/조망/투자가치 등)을 추가하지 않습니다.
 *
 * 도입/전환/마무리 문장은 매물마다 똑같아 보이지 않도록 여러 패턴 중에서
 * 고릅니다. 다만 무작위가 아니라 listing id를 해시한 값으로 고정 선택해서,
 * 같은 매물은 새로고침해도 항상 같은 글이 나오게 합니다(미리보기→수정→복사
 * 흐름에서 매번 문구가 바뀌면 혼란스러우므로).
 */

const PRODUCTION_SITE_URL = "https://hosooingurae.vercel.app";
const CASUAL_BRAND_NAME = "호수부동산";

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: string, salt: string): T {
  const index = hashSeed(`${seed}:${salt}`) % items.length;
  return items[index];
}

function extractDongFromAddress(address: string | undefined): string | undefined {
  if (!address) return undefined;
  return address
    .split(/\s+/)
    .find((token) => /^[가-힣]{2,}동$/.test(token));
}

function describeFloorPosition(
  floor: number,
  totalFloors: number,
): string | undefined {
  // floor === 0은 실제 1층이 아니라 "확인 안 됨" 신호입니다. 이걸 그대로
  // 나눗셈에 넣으면 ratio가 0이 돼 항상 "저층"이라는 틀린 사실이 광고에
  // 나가므로, 확인 안 된 값이면 아예 계산하지 않습니다.
  if (isUnknownListingNumber(floor) || isUnknownListingNumber(totalFloors)) {
    return undefined;
  }
  const ratio = floor / totalFloors;
  if (ratio >= 0.7) return "고층";
  if (ratio <= 0.3) return "저층";
  return "중층";
}

function buildTitle(input: AdCopyListingInput): string {
  const dong = extractDongFromAddress(input.complexAddress);
  const floorDesc = describeFloorPosition(input.floor, input.totalFloors);
  const areaLabel = input.unitType
    ? input.unitType
    : formatAreaForSentence(input.exclusiveArea);
  const buildingPart = input.building ? `${input.building} ` : "";

  const titleTailWords = [areaLabel, floorDesc].filter(
    (word): word is string => Boolean(word),
  );
  const titleTail =
    titleTailWords.length > 0
      ? `${titleTailWords.join(" ")} 매물 소개`
      : "매물 소개";

  const parts = [
    dong,
    `${input.complexName} ${buildingPart}${input.transactionType},`,
    titleTail,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" ");
}

/** 매매/전세/월세에 따라 가격을 부르는 말이 다르므로 하드코딩하지 않습니다. */
function priceLabelPrefix(transactionType: string): string {
  if (transactionType === "매매") return "매매가";
  if (transactionType === "전세") return "전세가";
  return "가격";
}

const GREETING_TEMPLATES: ((brand: string) => string)[] = [
  (brand) => `안녕하세요, ${brand}입니다 :)\n오늘 소개해드릴 매물은`,
  (brand) => `안녕하세요, ${brand}입니다.\n오늘은 이런 매물을 준비해봤어요.`,
  (brand) => `${brand}입니다. 반갑습니다 :)\n오늘 눈여겨볼 매물 하나 소개해드릴게요.`,
];

function buildIntroParagraph(input: AdCopyListingInput): string {
  const dong = extractDongFromAddress(input.complexAddress);
  const buildingLine =
    input.building && input.building.trim() !== ""
      ? `${input.building} `
      : "";
  const floorDesc = describeFloorPosition(input.floor, input.totalFloors);

  const areaInner = [
    formatAreaForSentence(input.supplyArea, "공급 "),
    formatAreaForSentence(input.exclusiveArea, "전용 "),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" / ");
  const areaPart = input.unitType
    ? areaInner
      ? `${input.unitType} 타입(${areaInner})`
      : `${input.unitType} 타입`
    : areaInner || undefined;

  const locationLine = dong
    ? `${dong}에 위치한 ${input.complexName}`
    : input.complexName;

  // 면적과 층수를 둘 다 확인할 수 없으면 위 두 문장 패턴 자체가 성립하지
  // 않으므로, 그 경우에만 쓸 대체 문장을 따로 둡니다.
  const closingVariants = areaPart
    ? [
        `${areaPart}이고, ${floorDesc ? `${floorDesc}에 자리하고 있어요.` : "층수도 참고하시면 좋을 것 같아요."}`,
        `${areaPart}으로, ${floorDesc ? `${floorDesc} 매물이에요.` : "구조와 층수도 함께 확인해보세요."}`,
      ]
    : [
        floorDesc
          ? `${floorDesc}에 자리한 매물이에요.`
          : "정확한 면적과 층수는 문의 주시면 안내해드릴게요.",
      ];

  const roomFragments = [
    isUnknownListingNumber(input.roomCount) ? undefined : `방은 ${input.roomCount}개`,
    isUnknownListingNumber(input.bathroomCount)
      ? undefined
      : `욕실은 ${input.bathroomCount}개`,
  ].filter((fragment): fragment is string => Boolean(fragment));
  const roomLine =
    roomFragments.length > 0
      ? `${roomFragments.join(", ")}로 구성되어 있고, 방향은 ${input.direction}이에요.`
      : `방향은 ${input.direction}이에요.`;

  const moveInVariants = [
    `입주는 ${input.moveInDate} 가능하고`,
    `입주 시점은 ${input.moveInDate}이고`,
  ];
  const maintenancePart =
    input.maintenanceFee && input.maintenanceFee.trim() !== ""
      ? `, 관리비는 ${input.maintenanceFee} 정도예요.`
      : "이에요.";
  const moveInLine = `${pick(moveInVariants, input.id, "move-in")}${maintenancePart}`;

  return [
    `${locationLine} ${buildingLine}${input.transactionType} 매물이에요.`,
    `${priceLabelPrefix(input.transactionType)}는 ${input.priceLabel}이고, ${pick(closingVariants, input.id, "intro-closing")}`,
    roomLine,
    moveInLine,
  ].join(" ");
}

const NOTABLE_INTRO_TEMPLATES = [
  "이 매물에서 눈여겨볼 만한 부분들을 몇 가지 짚어드릴게요.",
  "이 집만의 포인트를 조금 더 자세히 살펴볼까요?",
  "실제로 보면 더 좋지만, 몇 가지 특징을 먼저 소개해드릴게요.",
];

/**
 * shortDescription이 콤마로 구분돼 있으면(예: "포베이 구조,내부 깔끔,전망 굳") 그
 * 자체가 이미 의미 있는 구(phrase) 단위라 features 배열보다 신뢰도가 높습니다
 * (features는 파싱 과정에서 공백 기준으로 더 잘게 쪼개져 있을 수 있음). 콤마가
 * 없거나 phrase가 1개뿐이면 features 배열을 그대로 씁니다 — 둘 다 같은 DB
 * 데이터에서 나온 값이고, 새로 만들어내는 값은 없습니다.
 */
function extractNotablePhrases(input: AdCopyListingInput): string[] {
  const desc = input.shortDescription.trim();
  if (desc.includes(",")) {
    const phrases = desc
      .split(",")
      .map((phrase) => phrase.trim())
      .filter(Boolean);
    if (phrases.length >= 2) return phrases.slice(0, 4);
  }

  const unique = Array.from(
    new Set(input.features.map((feature) => feature.trim()).filter(Boolean)),
  );
  return unique.slice(0, 4);
}

// 앞뒤 문맥을 확신할 수 없는 조각(전망/내부 상태 등)을 위한 안전한 표현.
// 조사 변화가 없는 "도"만 원문 옆에 붙여 문법이 깨지지 않게 하고, 원문
// 표현을 그대로 인용하는 수준으로만 다듬습니다(새 의미를 더하지 않음).
const FALLBACK_TEMPLATES = [
  (phrase: string) =>
    `${phrase} 부분도 실제로 보시면 눈에 들어오는 포인트예요.`,
  (phrase: string) =>
    `${phrase}도 이 매물을 볼 때 함께 참고하시면 좋을 부분입니다.`,
];

function rephraseNotablePhrase(
  phrase: string,
  seed: string,
  fallbackRotation: number,
): string {
  if (/구조$/.test(phrase)) {
    return pick(
      [
        `${phrase}를 선호하시는 분이라면 한 번 체크해보셔도 좋을 것 같아요.`,
        `${phrase} 타입이라 공간을 어떻게 쓸지 궁금하신 분들께 참고가 될 부분이에요.`,
      ],
      seed,
      phrase,
    );
  }
  if (/인접$/.test(phrase)) {
    const noun = phrase.replace(/\s*인접$/, "");
    // noun이 어떤 받침으로 끝날지 모르므로(버스정류장/공원/역 등), 조사
    // 변화가 없는 "도"만 붙여 문법이 깨지지 않게 합니다.
    return pick(
      [
        `${noun}도 가까운 편이라 이동하실 때 부담이 적은 편이에요.`,
        `${noun} 접근성이 좋은 편이라 이동하실 때 편리해요.`,
      ],
      seed,
      phrase,
    );
  }
  if (/즉시입주/.test(phrase)) {
    return pick(
      [
        "입주를 서두르시는 분이라면 즉시입주가 가능하다는 점도 큰 장점이에요.",
        "바로 들어가실 수 있어서 이사 일정 맞추기가 수월한 편입니다.",
      ],
      seed,
      phrase,
    );
  }
  if (/역세권|지하철|역.*도보/.test(phrase)) {
    return pick(
      [`${phrase} 조건이라 대중교통 이용이 수월한 편이에요.`],
      seed,
      phrase,
    );
  }
  if (/남향|동향|서향|남동향|남서향|북향/.test(phrase)) {
    return pick(
      [`${phrase}이라 채광에 신경 쓰시는 분들께 좋은 조건이에요.`],
      seed,
      phrase,
    );
  }

  // 나머지는 fallbackRotation으로 강제 순환시켜, 바로 옆 문장과 같은
  // 표현이 연달아 나오지 않게 합니다(해시가 우연히 겹칠 수 있어서).
  return FALLBACK_TEMPLATES[fallbackRotation % FALLBACK_TEMPLATES.length](phrase);
}

function buildNotableSection(input: AdCopyListingInput): string | undefined {
  const phrases = extractNotablePhrases(input);
  if (phrases.length === 0) return undefined;

  const intro = pick(NOTABLE_INTRO_TEMPLATES, input.id, "notable-intro");
  let fallbackCount = 0;
  const sentences = phrases.map((phrase) => {
    const isFallback =
      !/구조$|인접$|즉시입주|역세권|지하철|역.*도보|남향|동향|서향|남동향|남서향|북향/.test(
        phrase,
      );
    const sentence = rephraseNotablePhrase(phrase, input.id, fallbackCount);
    if (isFallback) fallbackCount += 1;
    return sentence;
  });

  // 이미 말한 확인된 특징들을 그대로 다시 짚어주는 정리 문장(새 정보 추가 없음).
  const recap =
    phrases.length > 0
      ? `정리하자면 ${phrases.join(", ")} 같은 부분들이 이 매물의 눈에 띄는 포인트예요.`
      : undefined;

  return [intro, ...sentences, recap].filter(Boolean).join(" ");
}

function buildAtAGlanceBlock(input: AdCopyListingInput): string {
  const areaInner = [
    formatAreaForSentence(input.supplyArea, "공급 "),
    formatAreaForSentence(input.exclusiveArea, "전용 "),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" / ");
  const typeAreaValue = [input.unitType, areaInner]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  const floorText = formatFloorForSentence(input.floor);
  const totalFloorsText = floorText ? formatFloorForSentence(input.totalFloors) : null;
  const floorPart = floorText
    ? totalFloorsText
      ? `${floorText}/${totalFloorsText}`
      : floorText
    : undefined;
  const buildingPart =
    input.building && input.building.trim() !== "" ? input.building : undefined;
  const dongFloorValue = [buildingPart, floorPart]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const lines = [
    "🏠 매물 한눈에 보기",
    `- ${priceLabelPrefix(input.transactionType)}: ${input.priceLabel}`,
  ];
  // 타입/면적, 동/층 둘 다 확인된 값이 하나도 없으면 빈 항목("- 타입/면적: ")을
  // 내보내는 대신 그 줄 자체를 생략합니다.
  if (typeAreaValue) lines.push(`- 타입/면적: ${typeAreaValue}`);
  if (dongFloorValue) lines.push(`- 동/층: ${dongFloorValue}`);
  lines.push(`- 방향: ${input.direction}`, `- 입주: ${input.moveInDate}`);
  if (input.maintenanceFee && input.maintenanceFee.trim() !== "") {
    lines.push(`- 관리비: ${input.maintenanceFee}`);
  }
  return lines.join("\n");
}

const CLOSING_TEMPLATES = [
  "같은 평형이라도 동이나 층, 내부 컨디션에 따라 실제로 느껴지는 분위기는 차이가 날 수 있어서, 관심 있으시면 직접 보시는 걸 추천드려요.",
  "같은 타입이어도 동/층에 따라 느낌이 다른 경우가 많으니, 궁금하신 점은 편하게 문의해주세요.",
  "실제로 보시면 사진이나 글로 전달되지 않는 부분들도 있으니, 방문 상담을 통해 편하게 확인해보시면 좋을 것 같아요.",
];

const CONTACT_INVITE_TEMPLATES = [
  "매물 방문이나 다른 매물 상담도 언제든 편하게 연락 주세요.",
  "궁금하신 부분은 전화나 문자로 편하게 물어보셔도 좋아요.",
  "비슷한 조건의 다른 매물을 찾으신다면 그것도 함께 안내해드릴게요.",
];

const GLANCE_LEAD_TEMPLATES = [
  "글이 길었는데, 핵심 정보만 다시 한번 정리해드릴게요.",
  "여기까지 읽으신 분들을 위해 중요한 내용만 짧게 정리해봤어요.",
];

export function buildBlogAdCopy(input: AdCopyListingInput): string {
  const sections: string[] = [];

  sections.push(buildTitle(input));
  sections.push(
    `${pick(GREETING_TEMPLATES, input.id, "greeting")(CASUAL_BRAND_NAME)} ${buildIntroParagraph(input)}`,
  );

  const notableSection = buildNotableSection(input);
  if (notableSection) sections.push(notableSection);

  sections.push(
    `${pick(GLANCE_LEAD_TEMPLATES, input.id, "glance-lead")}\n\n${buildAtAGlanceBlock(input)}`,
  );

  sections.push(
    [
      pick(CLOSING_TEMPLATES, input.id, "closing"),
      input.hasPhoto
        ? "사진은 매물 상세페이지에서 함께 확인하실 수 있어요."
        : "사진은 현재 준비 중이니 참고해주세요.",
      pick(CONTACT_INVITE_TEMPLATES, input.id, "contact-invite"),
    ].join(" "),
  );

  sections.push(
    [
      CASUAL_BRAND_NAME,
      `☎ ${PHONE_NUMBER}`,
      `자세히 보기: ${PRODUCTION_SITE_URL}/listings/${input.id}`,
    ].join("\n"),
  );

  return sections.join("\n\n");
}
