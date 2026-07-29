import { getAllComplexes } from "./complexes";
import type { Complex } from "../data/complexes";
import type { Listing } from "../data/listings";
import {
  getComplexNameCandidates,
  stripTrailingBuildingFloor,
  type ParsedNaverListing,
} from "./naverTextParser";

export interface ComplexOption {
  id: string;
  name: string;
  address: string;
}

export async function getComplexOptions(): Promise<ComplexOption[]> {
  const complexes = await getAllComplexes();
  return complexes.map((complex) => ({
    id: complex.id,
    name: complex.name,
    address: complex.address,
  }));
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** complexName으로 기존 단지 중 가장 가능성 높은 단지를 추측합니다. 못 찾으면 null. */
export function suggestComplexId(
  complexName: string,
  complexes: Complex[],
): string | null {
  const target = normalizeName(complexName);
  if (!target) return null;

  const matched = complexes.find((complex) => {
    const name = normalizeName(complex.name);
    return name === target || name.includes(target) || target.includes(name);
  });

  return matched?.id ?? null;
}

/**
 * 원문 앞쪽 여러 줄(상태 배지 라인 제외) 중 기존 단지 목록과 실제로 매칭되는
 * 줄을 순서대로 찾아 그 줄로 complexId를 만듭니다. "집주인확인매물" 같은 배지가
 * 단지명보다 먼저 나오는 경우에도, 첫 줄이 아니라 실제로 매칭되는 줄을 기준으로
 * 판단합니다. 매칭되는 후보가 하나도 없으면 빈 값입니다(단지를 추측해서 지정하지
 * 않음).
 */
function resolveComplexId(rawSourceText: string, complexes: Complex[]): string {
  for (const candidate of getComplexNameCandidates(rawSourceText)) {
    const matched = suggestComplexId(candidate, complexes);
    if (matched) return matched;
  }
  return "";
}

/**
 * complexId가 끝내 비었을 때(=매칭되는 기존 단지가 없을 때) "새 단지 등록" 폼의
 * 단지명 기본값으로 쓸 후보를 반환합니다. 동/층 표기는 제거합니다. 관리자가
 * 반드시 버튼을 눌러야 실제로 등록되며, 여기서는 값을 만들어 보여주기만 합니다.
 */
export function getSuggestedComplexName(rawSourceText: string): string | undefined {
  const [first] = getComplexNameCandidates(rawSourceText);
  if (!first) return undefined;
  const cleaned = stripTrailingBuildingFloor(first);
  return cleaned || undefined;
}

/** 한글은 URL 슬러그로 적합하지 않아 제거하고, 영문/숫자만 남깁니다. */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 시드(단지명 등)로 사람이 읽을 수 있는 고유 매물 ID를 생성합니다.
 * 시드가 한글뿐이라 남는 영문/숫자가 없으면 "naver-import"로 대체합니다.
 * 관리자는 등록 전 미리보기 화면에서 ID를 자유롭게 수정할 수 있습니다.
 */
export function generateListingId(seed: string): string {
  const base = slugify(seed) || "naver-import";
  return `${base}-${Date.now().toString(36)}`;
}

/** naverUrl의 articleNo 쿼리 파라미터를 있는 그대로 추출합니다(크롤링이 아닌 URL 파싱). */
export function extractArticleNumber(url: string): string | undefined {
  try {
    return new URL(url).searchParams.get("articleNo") ?? undefined;
  } catch {
    return undefined;
  }
}

export interface ImportSource {
  /** 사용자가 함께 입력한 URL(선택). 서버는 이 URL로 네트워크 요청을 보내지 않습니다. */
  url?: string;
  /** URL의 articleNo에서 추출된 경우에만 존재. 중복 등록 검사에 사용됩니다. */
  sourceArticleId?: string;
  /** 관리자가 붙여넣은 원문 전체. */
  rawSourceText: string;
}

/** verifiedOwnerConfirmationDate(YYYY-MM-DD)를 lastVerifiedAt에 쓸 ISO 문자열로 변환합니다. */
function toLastVerifiedAt(date: string | undefined): string | undefined {
  return date ? `${date}T00:00:00.000Z` : undefined;
}

/**
 * 텍스트 파서(app/lib/naverTextParser.ts)가 반환한 결과를 기존 Listing 데이터
 * 구조로 변환합니다.
 *
 * 파서가 인식하지 못한 값은 추측하지 않고 빈 값(문자열은 "", 숫자는 0)으로
 * 남겨둡니다. 어떤 필드가 비어있는지는 getUncertainFieldLabels()로 별도 안내합니다.
 * status는 기본 공개(published)로 시작하되, 관리자가 등록 화면에서 체크를
 * 해제하면 임시저장으로 등록할 수 있습니다.
 */
export async function transformToDraftListing(
  parsed: ParsedNaverListing,
  source: ImportSource,
): Promise<Listing> {
  const complexes = await getAllComplexes();
  const complexId = resolveComplexId(source.rawSourceText, complexes);

  return {
    id: generateListingId(parsed.complexName ?? "naver-import"),
    complexId,
    propertyType: parsed.propertyType ?? "아파트",
    status: "published",
    dealStatus: "advertising",
    transactionType: parsed.transactionType ?? "매매",
    price: parsed.price ?? 0,
    priceLabel: parsed.priceLabel ?? "",
    building: parsed.building ?? "",
    floor: parsed.floor ?? 0,
    totalFloors: parsed.totalFloors ?? 0,
    supplyArea: parsed.supplyArea ?? 0,
    exclusiveArea: parsed.exclusiveArea ?? 0,
    roomCount: parsed.roomCount ?? 0,
    bathroomCount: parsed.bathroomCount ?? 0,
    direction: parsed.direction ?? "",
    moveInDate: parsed.moveInDate ?? "",
    maintenanceFee: parsed.maintenanceFee ?? "",
    shortDescription: parsed.shortDescription ?? "",
    features: parsed.features ?? [],
    naverUrl: source.url,
    articleNumber: parsed.articleNumber,
    sourceType: "naver",
    sourceArticleId: source.sourceArticleId,
    rawSourceText: source.rawSourceText,
    verifiedDate: new Date().toISOString().slice(0, 10),
    // 집주인확인매물 날짜를 찾았을 때만 채우고, 못 찾으면 비워둡니다(오늘
    // 날짜로 대체 금지). 비어있으면 getVerificationUrgency가 "urgent"로 잡아
    // 기존 "확인 필요" 메커니즘이 자연스럽게 안내합니다.
    lastVerifiedAt: toLastVerifiedAt(parsed.verifiedOwnerConfirmationDate),
    isFeatured: false,
  };
}

/**
 * 새로 파싱한 결과를 이미 등록된 매물(existing)에 병합합니다("기존 매물
 * 업데이트" 흐름 전용). 관리자가 예전에 직접 입력해둔 값을, 이번 파싱
 * 결과가 비어있다는 이유로 지우지 않도록 각 필드마다 "새 값이 실제로
 * 있을 때만 덮어쓰기" 규칙을 적용합니다.
 *
 * 공개 상태(status)·거래 진행 상태(dealStatus)·대표매물 여부·사진 등은
 * 이 업데이트의 대상이 아니므로 기존 값을 그대로 유지합니다. 마지막
 * 확인일은 이번에 새로 추출한 날짜가 있으면 그 값을, 없으면 기존 값을
 * 그대로 유지합니다(우선순위: 관리자가 이후 화면에서 직접 수정 > 새로
 * 추출한 날짜 > 기존 값 > 빈 값 — 관리자의 화면 수정은 이 병합 결과를
 * 그대로 폼에 채운 뒤 저장 전 자유롭게 고칠 수 있게 하는 것으로 만족됩니다).
 */
export function mergeParsedIntoExisting(
  existing: Listing,
  parsed: ParsedNaverListing,
  source: ImportSource,
): Listing {
  const nonEmptyString = (value: string | undefined, fallback: string): string =>
    value && value.trim() !== "" ? value : fallback;
  const positiveNumber = (value: number | undefined, fallback: number): number =>
    value !== undefined && value > 0 ? value : fallback;

  return {
    ...existing,
    propertyType: parsed.propertyType ?? existing.propertyType,
    transactionType: parsed.transactionType ?? existing.transactionType,
    price: positiveNumber(parsed.price, existing.price),
    priceLabel: nonEmptyString(parsed.priceLabel, existing.priceLabel),
    building: nonEmptyString(parsed.building, existing.building),
    floor: positiveNumber(parsed.floor, existing.floor),
    totalFloors: positiveNumber(parsed.totalFloors, existing.totalFloors),
    supplyArea: positiveNumber(parsed.supplyArea, existing.supplyArea),
    exclusiveArea: positiveNumber(parsed.exclusiveArea, existing.exclusiveArea),
    roomCount: positiveNumber(parsed.roomCount, existing.roomCount),
    bathroomCount: positiveNumber(parsed.bathroomCount, existing.bathroomCount),
    direction: nonEmptyString(parsed.direction, existing.direction),
    moveInDate: nonEmptyString(parsed.moveInDate, existing.moveInDate),
    maintenanceFee: nonEmptyString(parsed.maintenanceFee, existing.maintenanceFee ?? ""),
    shortDescription: nonEmptyString(parsed.shortDescription, existing.shortDescription),
    features: parsed.features && parsed.features.length > 0 ? parsed.features : existing.features,
    naverUrl: source.url ?? existing.naverUrl,
    articleNumber: parsed.articleNumber ?? existing.articleNumber,
    sourceType: existing.sourceType ?? "naver",
    sourceArticleId: source.sourceArticleId ?? existing.sourceArticleId,
    rawSourceText: source.rawSourceText,
    lastVerifiedAt:
      toLastVerifiedAt(parsed.verifiedOwnerConfirmationDate) ?? existing.lastVerifiedAt,
  };
}
