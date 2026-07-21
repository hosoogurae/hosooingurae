import type { PropertyType, TransactionType } from "../data/listings";
import { formatPriceFull } from "./transactions";

/**
 * 네이버 부동산 매물 상세 화면에서 사람이 직접 복사해 붙여넣은 텍스트를 분석한 결과.
 *
 * 서버가 네이버 페이지를 직접 요청하거나 크롤링하지 않습니다 — 이 모듈은 순수
 * 텍스트 처리만 하며 네트워크 호출이 전혀 없습니다. 필드는 전부 optional이며,
 * 텍스트에서 확실히 인식된 값만 채웁니다. 애매하면 채우지 않고 비워둡니다
 * (추측/허위 값 생성 금지).
 */
export interface ParsedNaverListing {
  complexName?: string;
  /** "201동"처럼 동 번호 + "동" 접미사. 층수와는 분리해서 인식합니다. */
  building?: string;
  transactionType?: TransactionType;
  propertyType?: PropertyType;
  /** 만원 단위 (매매가/전세보증금/월세보증금 기준). */
  price?: number;
  priceLabel?: string;
  supplyArea?: number;
  exclusiveArea?: number;
  floor?: number;
  totalFloors?: number;
  direction?: string;
  roomCount?: number;
  bathroomCount?: number;
  /** 값이 확인될 때만 채움. */
  maintenanceFee?: string;
  /** 값이 확인될 때만 채움. */
  moveInDate?: string;
  /** "매물특징" 라벨 뒤 문구를 항목별로 나눈 배열. 원문 표현 그대로. */
  features?: string[];
  /** features를 원문 순서 그대로 공백으로 이어붙인 문구. */
  shortDescription?: string;
}

const TRANSACTION_TYPES: TransactionType[] = ["매매", "전세", "월세"];
const PROPERTY_TYPES: PropertyType[] = ["아파트", "오피스텔", "상가", "단독주택"];
const DIRECTIONS = [
  "남동향",
  "남서향",
  "북동향",
  "북서향",
  "남향",
  "북향",
  "동향",
  "서향",
];

/** 필드별로 화면에 보여줄 한글 라벨. uncertainFields 안내에 사용합니다. */
const FIELD_LABELS: Partial<Record<keyof ParsedNaverListing, string>> = {
  complexName: "단지명",
  building: "동",
  transactionType: "거래유형",
  propertyType: "매물종류",
  priceLabel: "가격",
  supplyArea: "공급면적",
  exclusiveArea: "전용면적",
  floor: "층수",
  totalFloors: "층수",
  direction: "방향",
  roomCount: "방/욕실 수",
  bathroomCount: "방/욕실 수",
  maintenanceFee: "관리비",
  moveInDate: "입주가능일",
  features: "특징",
  shortDescription: "매물 설명",
};

/**
 * "4억 2,000", "4억2,000", "9,500만원", "9500" 같은 한국식 금액 표기를
 * 만원 단위 숫자로 변환합니다. 인식할 수 없으면 null.
 */
function parseKoreanAmountToManwon(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;

  const eokMatch = cleaned.match(/^(\d+)\s*억\s*(\d+)?/);
  if (eokMatch) {
    const eok = Number(eokMatch[1]);
    const rest = eokMatch[2] ? Number(eokMatch[2]) : 0;
    if (Number.isFinite(eok) && Number.isFinite(rest)) {
      return eok * 10000 + rest;
    }
    return null;
  }

  const manMatch = cleaned.match(/^(\d+)\s*만?\s*원?$/);
  if (manMatch) {
    const value = Number(manMatch[1]);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function parsePriceSection(text: string): {
  transactionType?: TransactionType;
  price?: number;
  priceLabel?: string;
} {
  // 월세는 "보증금/월세" 두 금액이 함께 표시되는 경우가 많아 먼저 확인합니다.
  const rentMatch = text.match(
    /월세[^\n]*?([0-9,]+(?:\s*억\s*[0-9,]*)?)\s*\/\s*([0-9,]+(?:\s*억\s*[0-9,]*)?)/,
  );
  if (rentMatch) {
    const deposit = parseKoreanAmountToManwon(rentMatch[1]);
    const rent = parseKoreanAmountToManwon(rentMatch[2]);
    if (deposit !== null && rent !== null) {
      return {
        transactionType: "월세",
        price: deposit,
        priceLabel: `보증금 ${formatPriceFull(deposit)} / 월세 ${formatPriceFull(rent)}`,
      };
    }
  }

  for (const type of ["매매", "전세"] as const) {
    const pattern = new RegExp(`${type}[^\\n\\d]{0,4}([0-9,]+(?:\\s*억\\s*[0-9,]*)?)`);
    const match = text.match(pattern);
    if (match) {
      const amount = parseKoreanAmountToManwon(match[1]);
      if (amount !== null && amount > 0) {
        return { transactionType: type, price: amount, priceLabel: formatPriceFull(amount) };
      }
    }
  }

  return {};
}

function parsePropertyType(text: string): PropertyType | undefined {
  return PROPERTY_TYPES.find((type) => text.includes(type));
}

function parseDirection(text: string): string | undefined {
  const labelMatch = text.match(/방향\s*[:：]?\s*([가-힣]{1,3}향)/);
  if (labelMatch && DIRECTIONS.includes(labelMatch[1])) {
    return labelMatch[1];
  }
  return DIRECTIONS.find((direction) => text.includes(direction));
}

function parseAreas(text: string): { supplyArea?: number; exclusiveArea?: number } {
  const comboMatch = text.match(
    /공급\s*\/?\s*전용\s*면적\s*[:：]?\s*([\d.]+)\s*㎡\s*\/\s*([\d.]+)\s*㎡/,
  );
  if (comboMatch) {
    return { supplyArea: Number(comboMatch[1]), exclusiveArea: Number(comboMatch[2]) };
  }

  const result: { supplyArea?: number; exclusiveArea?: number } = {};
  const supplyMatch = text.match(/공급\s*면적\s*[:：]?\s*([\d.]+)\s*㎡/);
  if (supplyMatch) result.supplyArea = Number(supplyMatch[1]);
  const exclusiveMatch = text.match(/전용\s*면적\s*[:：]?\s*([\d.]+)\s*㎡/);
  if (exclusiveMatch) result.exclusiveArea = Number(exclusiveMatch[1]);
  return result;
}

function parseFloors(text: string): { floor?: number; totalFloors?: number } {
  const patterns = [
    /해당\s*층\s*\/?\s*총\s*층\s*[:：]?\s*(\d+)\s*층?\s*\/\s*(\d+)\s*층?/,
    /(\d+)\s*층\s*\/\s*(\d+)\s*층/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { floor: Number(match[1]), totalFloors: Number(match[2]) };
    }
  }
  return {};
}

function parseRoomsBathrooms(text: string): {
  roomCount?: number;
  bathroomCount?: number;
} {
  const patterns = [
    /방\s*수\s*\/?\s*욕실\s*수\s*[:：]?\s*(\d+)\s*개?\s*\/\s*(\d+)\s*개?/,
    /방\s*(\d+)\s*개?\s*\/\s*욕실\s*(\d+)\s*개?/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { roomCount: Number(match[1]), bathroomCount: Number(match[2]) };
    }
  }
  return {};
}

/** 네이버 UI에서 값 뒤에 붙는 링크성 문구. 관리비 값이 아니므로 제거합니다. */
const MAINTENANCE_FEE_UI_NOISE = /상세보기|도움말/g;

function parseMaintenanceFee(text: string): string | undefined {
  // "관리비" 라벨 바로 뒤(같은 줄)의 값만 봅니다. 평당가·매매가 등 다른 곳의
  // "만원"을 관리비로 오인하지 않도록 반드시 이 라벨을 기준으로만 파싱합니다.
  const labelMatch = text.match(/관리비\s*[:：]?\s*([^\n]{1,30})/);
  if (!labelMatch) return undefined;

  const raw = labelMatch[1].replace(MAINTENANCE_FEE_UI_NOISE, "").trim();
  if (!raw) return undefined;

  if (/^없음/.test(raw)) return "없음";

  // "28만원", "28 만원", "월 28만원", "약 28만원"처럼 만원 단위로 바로 적힌 경우.
  const manwonMatch = raw.match(/^(월|약)?\s*([0-9]+(?:\.[0-9]+)?)\s*만\s*원/);
  if (manwonMatch) {
    const amount = Number(manwonMatch[2]);
    if (Number.isFinite(amount)) {
      if (amount === 0) return "없음";
      const prefix = manwonMatch[1] ? `${manwonMatch[1]} ` : "";
      return `${prefix}${amount}만원`;
    }
  }

  // "150,000원", "0원"처럼 원 단위로 적힌 경우 만원으로 환산합니다.
  const wonMatch = raw.match(/^(월|약)?\s*([0-9,]+)\s*원/);
  if (wonMatch) {
    const amount = Number(wonMatch[2].replace(/,/g, ""));
    if (Number.isFinite(amount)) {
      if (amount === 0) return "없음";
      const prefix = wonMatch[1] ? `${wonMatch[1]} ` : "";
      const manwon = Math.round(amount / 10000);
      return manwon > 0
        ? `${prefix}약 ${manwon}만원`
        : `${prefix}${amount.toLocaleString()}원`;
    }
  }

  // 그 외 숫자로 시작하지 않는 서술형("세대별 상이" 등)만 신뢰합니다.
  if (!/^\d/.test(raw)) return raw;

  return undefined;
}

function parseMoveInDate(text: string): string | undefined {
  const labelMatch = text.match(/입주\s*가능일\s*[:：]?\s*([^\n]{1,20})/);
  if (labelMatch) {
    const value = labelMatch[1].trim();
    if (value) return value;
  }
  if (text.includes("즉시입주")) return "즉시입주 가능";
  return undefined;
}

/** 네이버 UI에서 값 뒤에 붙는 링크성 문구. 매물특징 값이 아니므로 제거합니다. */
const FEATURES_UI_NOISE = /상세보기|도움말/g;

/**
 * "매물특징" 라벨 뒤, 같은 줄(다음 정보 라벨이 시작되기 전)까지의 문구만
 * 항목별로 나눠 반환합니다. 원문 단어를 그대로 쓰고 새로 만들거나 고치지
 * 않습니다.
 */
function parseFeatureTags(text: string): string[] | undefined {
  const labelMatch = text.match(/매물특징\s*[:：]?\s*([^\n]{1,200})/);
  if (!labelMatch) return undefined;

  const raw = labelMatch[1].replace(FEATURES_UI_NOISE, "").trim();
  if (!raw) return undefined;

  const tags = raw.split(/\s+/).filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

/**
 * 네이버 매물 화면에서 실제 단지명 줄보다 먼저 나올 수 있는 상태 배지 라인.
 * 단지명 후보에서 제외합니다.
 */
const COMPLEX_NAME_BADGE_PATTERNS = [
  /^집주인확인매물/,
  /^확인매물$/,
  /^VR매물$/,
  /^추천$/,
];

/**
 * 텍스트 앞쪽 여러 줄 중 단지명일 가능성이 있는 줄들을 순서대로 반환합니다.
 * "집주인확인매물" 같은 상태 배지 라인은 제외하며, 이 중 실제로 어떤 줄이
 * 단지명인지는(기존 단지 목록과 매칭해서) 호출하는 쪽에서 결정합니다 — 이
 * 함수는 후보만 추릴 뿐 단정하지 않습니다.
 */
export function getComplexNameCandidates(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 5);

  return lines.filter((line) => {
    if (COMPLEX_NAME_BADGE_PATTERNS.some((pattern) => pattern.test(line))) return false;
    if (TRANSACTION_TYPES.some((type) => line.startsWith(type))) return false;
    if (/^\d/.test(line)) return false;
    if (line.length > 40) return false;
    return true;
  });
}

function parseComplexName(text: string): string | undefined {
  return getComplexNameCandidates(text)[0];
}

/**
 * 단지명 후보 줄 끝에 붙은 "201동6층" 같은 동/층 표기를 제거해 순수 단지명만
 * 남깁니다. "새 단지 등록" 폼에 기본값으로 채울 때 사용합니다.
 */
export function stripTrailingBuildingFloor(line: string): string {
  return line.replace(/\s*\d+\s*동\s*\d+\s*층\s*$/, "").trim();
}

/**
 * "201동6층"처럼 동과 층수가 붙어 나오는 표기에서 동만 추출합니다. 층수는
 * 별도로 parseFloors()가 처리하므로 여기서는 동 번호만 반환합니다("201동").
 * "동" 앞에 숫자가, "동" 뒤(공백 있어도 됨)에 "숫자+층"이 함께 있을 때만
 * 인식합니다 — "구래동", "공동주택"처럼 숫자와 무관한 "동"과 헷갈리지 않도록
 * 반드시 이 조합으로만 판단합니다.
 */
function parseBuilding(text: string): string | undefined {
  const match = text.match(/(\d+)\s*동\s*\d+\s*층/);
  return match ? `${match[1]}동` : undefined;
}

/** 네이버 매물 상세에서 복사한 텍스트를 분석합니다. 네트워크 호출이 전혀 없습니다. */
export function parseNaverListingText(rawText: string): ParsedNaverListing {
  const text = rawText.replace(/\r\n/g, "\n");

  const { transactionType, price, priceLabel } = parsePriceSection(text);
  const { supplyArea, exclusiveArea } = parseAreas(text);
  const { floor, totalFloors } = parseFloors(text);
  const { roomCount, bathroomCount } = parseRoomsBathrooms(text);
  const featureTags = parseFeatureTags(text);

  return {
    complexName: parseComplexName(text),
    building: parseBuilding(text),
    transactionType,
    propertyType: parsePropertyType(text),
    price,
    priceLabel,
    supplyArea,
    exclusiveArea,
    floor,
    totalFloors,
    direction: parseDirection(text),
    roomCount,
    bathroomCount,
    maintenanceFee: parseMaintenanceFee(text),
    moveInDate: parseMoveInDate(text),
    features: featureTags,
    shortDescription: featureTags ? featureTags.join(" ") : undefined,
  };
}

/** 인식하지 못해 관리자가 직접 확인해야 하는 필드의 한글 라벨 목록(중복 제거). */
export function getUncertainFieldLabels(parsed: ParsedNaverListing): string[] {
  const labels = new Set<string>();

  for (const [key, label] of Object.entries(FIELD_LABELS) as [
    keyof ParsedNaverListing,
    string,
  ][]) {
    if (parsed[key] === undefined) {
      labels.add(label);
    }
  }

  return Array.from(labels);
}
