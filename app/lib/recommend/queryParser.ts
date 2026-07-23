import type { PropertyType, TransactionType } from "../../data/listings";
import { parseKoreanAmountToManwon } from "../naverTextParser";
import { formatPriceFull } from "../transactions";

export type FloorTier = "high" | "low";

export interface PriceCondition {
  /** 만원 단위. */
  min: number;
  /** 만원 단위. openEnded면 점수 계산에서만 쓰고 화면에는 상한을 보여주지 않습니다. */
  max: number;
  openEnded: boolean;
  /** 사용자에게 그대로 보여줄 해석 결과 문구. */
  interpretation: string;
}

export interface ParsedQuery {
  raw: string;
  propertyType?: PropertyType;
  transactionType?: TransactionType;
  price?: PriceCondition;
  /** DB에 실제로 존재하는 것으로 확인된 단지명(중복 매칭 등 확정 못하면 비워둠). */
  complexName?: string;
  roomCount?: number;
  floorTier?: FloorTier;
  wantsImmediateMoveIn?: boolean;
  /** 인식하지 못하고 남은 표현(사용자에게 "반영하지 못한 조건"으로 보여줄 용도). */
  unrecognizedPhrases: string[];
}

export interface QueryParserContext {
  /** 현재 DB에 실제로 존재하는 단지명 목록(부분 일치 판단용). */
  knownComplexNames: string[];
}

export interface QueryParser {
  parse(query: string, context: QueryParserContext): ParsedQuery;
}

const PROPERTY_TYPES: PropertyType[] = ["아파트", "오피스텔", "상가", "단독주택", "기타"];
const TRANSACTION_TYPES: TransactionType[] = ["매매", "전세", "월세"];

const STOPWORDS = new Set([
  "집",
  "매물",
  "찾아줘",
  "찾아주세요",
  "추천",
  "추천해줘",
  "추천해주세요",
  "해줘",
  "해주세요",
  "원해요",
  "원합니다",
  "주세요",
  "알려줘",
  "알려주세요",
  "보여줘",
  "보여주세요",
  "좀",
  "같은",
  "곳",
  "것",
  "거",
  "그리고",
  "및",
  "의",
  "을",
  "를",
  "이",
  "가",
  "은",
  "는",
  "에서",
  "으로",
  "로",
  "이고",
  "이며",
  "인",
  "한",
  "하는",
  "있는",
  "있",
  "살고",
  "짜리",
  "정도",
  "쯤",
  "가능한",
  "가능",
  "보증금",
]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 매칭된 부분을 공백으로 치환해, 남은 텍스트에서 인식 못한 조건을 찾을 수 있게 합니다. */
function consume(text: string, pattern: RegExp): string {
  return text.replace(pattern, " ");
}

function parsePropertyType(text: string): PropertyType | undefined {
  return PROPERTY_TYPES.find((type) => text.includes(type));
}

function parseTransactionType(text: string): TransactionType | undefined {
  return TRANSACTION_TYPES.find((type) => text.includes(type));
}

function parseRoomCount(text: string): number | undefined {
  const match = text.match(/방\s*(\d+)\s*개/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function parseFloorTier(text: string): FloorTier | undefined {
  if (/고층|높은\s*층/.test(text)) return "high";
  if (/저층|낮은\s*층/.test(text)) return "low";
  return undefined;
}

function parseImmediateMoveIn(text: string): boolean {
  return /즉시\s*입주|바로\s*입주/.test(text);
}

/**
 * 가격 조건을 해석합니다. 우선순위: "X 이하/이상" 같은 명시적 기준선 >
 * "X억 초반/중반/후반/대" 같은 구간 표현 > 만 단위까지 정확히 적힌 금액 >
 * "X억"처럼 억 단위만 적힌 대략적인 금액. 어느 것도 못 찾으면 undefined이며,
 * 절대 임의의 가격을 지어내지 않습니다.
 */
function parsePriceCondition(text: string): {
  condition?: PriceCondition;
  consumedText: string;
} {
  let consumedText = text;

  const thresholdMatch = text.match(
    /([0-9,]+\s*억\s*[0-9,]*|[0-9,]+\s*만?\s*원?)\s*(이하|이내|미만|이상|초과)/,
  );
  if (thresholdMatch) {
    const amount = parseKoreanAmountToManwon(thresholdMatch[1]);
    if (amount !== null) {
      const isUpperBound = ["이하", "이내", "미만"].includes(thresholdMatch[2]);
      consumedText = consume(consumedText, new RegExp(escapeRegExp(thresholdMatch[0])));
      if (isUpperBound) {
        return {
          condition: {
            min: 0,
            max: amount,
            openEnded: false,
            interpretation: `"${thresholdMatch[0].trim()}" → ${formatPriceFull(amount)} 이하로 검색했습니다.`,
          },
          consumedText,
        };
      }
      return {
        condition: {
          min: amount,
          max: amount * 2,
          openEnded: true,
          interpretation: `"${thresholdMatch[0].trim()}" → ${formatPriceFull(amount)} 이상으로 검색했습니다.`,
        },
        consumedText,
      };
    }
  }

  const bandMatch = text.match(/(\d+)\s*억\s*(초반|중반|후반|대)/);
  if (bandMatch) {
    const eok = Number(bandMatch[1]);
    const base = eok * 10000;
    const qualifier = bandMatch[2];
    const [minOffset, maxOffset] =
      qualifier === "초반"
        ? [0, 3000]
        : qualifier === "중반"
          ? [4000, 6000]
          : qualifier === "후반"
            ? [7000, 9000]
            : [0, 9000]; // "대"
    const min = base + minOffset;
    const max = base + maxOffset;
    consumedText = consume(consumedText, new RegExp(escapeRegExp(bandMatch[0])));
    return {
      condition: {
        min,
        max,
        openEnded: false,
        interpretation: `"${bandMatch[0]}" → 약 ${formatPriceFull(min)}~${formatPriceFull(max)}으로 검색했습니다.`,
      },
      consumedText,
    };
  }

  const exactMatch = text.match(/(\d+)\s*억\s*([0-9,]+)/);
  if (exactMatch) {
    const amount = parseKoreanAmountToManwon(`${exactMatch[1]}억${exactMatch[2]}`);
    if (amount !== null) {
      consumedText = consume(consumedText, new RegExp(escapeRegExp(exactMatch[0])));
      return {
        condition: {
          min: amount - 1000,
          max: amount + 1000,
          openEnded: false,
          interpretation: `"${exactMatch[0]}" → ${formatPriceFull(amount)} 근처로 검색했습니다.`,
        },
        consumedText,
      };
    }
  }

  const bareEokMatch = text.match(/(\d+)\s*억(?!\s*\d)/);
  if (bareEokMatch) {
    const eok = Number(bareEokMatch[1]);
    const base = eok * 10000;
    consumedText = consume(consumedText, new RegExp(escapeRegExp(bareEokMatch[0])));
    return {
      condition: {
        min: base,
        max: base + 9000,
        openEnded: false,
        interpretation: `"${bareEokMatch[0]}" → 약 ${formatPriceFull(base)}~${formatPriceFull(base + 9000)}으로 검색했습니다.`,
      },
      consumedText,
    };
  }

  return { condition: undefined, consumedText };
}

/**
 * 단지명을 전체 그대로 입력하지 않아도("호수마을에서") 인식할 수 있게, "2단지"
 * 같은 끝자리 표기를 뗀 나머지 전체, 또는 그 앞 4글자(흔히 쓰는 줄임 표현)가
 * 문장에 포함되는지 봅니다. 여러 단지가 동시에 걸리면(예: "호수마을"이
 * 2단지·3단지 둘 다와 겹침) 문장에 "N단지" 표기가 있는 경우에만 그걸로
 * 좁히고, 그래도 안 되면 어느 쪽인지 단정하지 않고 그대로 둡니다.
 */
function findMatchingComplexNames(text: string, knownComplexNames: string[]): string[] {
  let candidates = knownComplexNames.filter((name) => {
    if (text.includes(name)) return true;
    const withoutSuffix = name.replace(/\d+단지$/, "");
    if (withoutSuffix.length >= 3 && text.includes(withoutSuffix)) return true;
    const shortPrefix = withoutSuffix.slice(0, Math.min(4, withoutSuffix.length));
    return shortPrefix.length >= 3 && text.includes(shortPrefix);
  });

  if (candidates.length > 1) {
    const suffixMatch = text.match(/\d+단지/);
    if (suffixMatch) {
      const narrowed = candidates.filter((name) => name.endsWith(suffixMatch[0]));
      if (narrowed.length > 0) candidates = narrowed;
    }
  }

  return candidates;
}

function extractUnrecognizedPhrases(remainingText: string): string[] {
  return remainingText
    .split(/,|그리고|이고|이며/)
    .map((phrase) => phrase.trim())
    .map((phrase) =>
      phrase
        .split(/\s+/)
        .filter((word) => word.length > 0 && !STOPWORDS.has(word))
        .join(" ")
        .trim(),
    )
    .filter((phrase) => phrase.length >= 2);
}

function ruleBasedParse(query: string, context: QueryParserContext): ParsedQuery {
  let remaining = query;

  const propertyType = parsePropertyType(remaining);
  if (propertyType) remaining = consume(remaining, new RegExp(escapeRegExp(propertyType)));

  const transactionType = parseTransactionType(remaining);
  if (transactionType) remaining = consume(remaining, new RegExp(escapeRegExp(transactionType)));

  const roomCount = parseRoomCount(remaining);
  if (roomCount !== undefined) {
    remaining = consume(remaining, /방\s*\d+\s*개/);
  }

  const floorTier = parseFloorTier(remaining);
  if (floorTier) remaining = consume(remaining, /고층|낮은\s*층|높은\s*층|저층/);

  const wantsImmediateMoveIn = parseImmediateMoveIn(remaining);
  if (wantsImmediateMoveIn) remaining = consume(remaining, /즉시\s*입주|바로\s*입주/);

  const { condition: price, consumedText } = parsePriceCondition(remaining);
  remaining = consumedText;

  const matchedComplexNames = findMatchingComplexNames(remaining, context.knownComplexNames);
  let complexName: string | undefined;
  if (matchedComplexNames.length === 1) {
    complexName = matchedComplexNames[0];
    const withoutSuffix = complexName.replace(/\d+단지$/, "");
    const pattern = remaining.includes(complexName) ? complexName : withoutSuffix;
    remaining = consume(remaining, new RegExp(escapeRegExp(pattern)));
  }
  // 2개 이상 겹치면(예: "호수마을"이 2단지·3단지 둘 다와 겹침) 어느 쪽인지 단정하지
  // 않고 그대로 두어, 아래에서 "반영하지 못한 조건"으로 안내되게 합니다.

  const unrecognizedPhrases = extractUnrecognizedPhrases(remaining);

  return {
    raw: query,
    propertyType,
    transactionType,
    price,
    complexName,
    roomCount,
    floorTier,
    wantsImmediateMoveIn: wantsImmediateMoveIn || undefined,
    unrecognizedPhrases,
  };
}

/**
 * 지금은 규칙 기반 구현체 하나뿐이지만, 나중에 AI 모델을 붙일 때는 이 인터페이스를
 * 그대로 구현한 새 QueryParser(예: aiQueryParser)를 만들어 app/recommend/page.tsx에서
 * 갈아끼우면 됩니다. 점수 계산(scoring.ts)은 ParsedQuery 모양만 알면 되므로 손댈 필요가
 * 없습니다.
 */
export const ruleBasedQueryParser: QueryParser = { parse: ruleBasedParse };
